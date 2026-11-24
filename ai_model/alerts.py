import logging
import sqlite3
import threading
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import requests

logger = logging.getLogger(__name__)


class AlertManager:
    def __init__(self, config: dict, fps: float):
        self.config = config
        self.fps = max(1.0, fps or float(config["video_fps"]))
        self.alerts_dir = Path(config["alerts_dir"])
        self.alerts_dir.mkdir(parents=True, exist_ok=True)
        Path(config["events_db"]).parent.mkdir(parents=True, exist_ok=True)
        self.pre_frames = max(1, round(self.fps * config["clip_seconds"] / 2))
        self.post_frames = self.pre_frames
        self.frame_buffer = deque(maxlen=self.pre_frames)
        self.pending_clips = []
        self.db = sqlite3.connect(config["events_db"])
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA busy_timeout=1000")
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                object_class TEXT NOT NULL,
                track_id INTEGER NOT NULL,
                confidence REAL NOT NULL,
                snapshot_path TEXT NOT NULL
            )
        """)
        self.db.commit()
        self.telegram_token = config.get("bot_token")
        self.chat_id = config.get("chat_id")
        self.last_telegram_time = 0.0
        self.telegram_lock = threading.Lock()
        if not self.telegram_token or not self.chat_id:
            logger.warning("Telegram notifications disabled: set BOT_TOKEN and CHAT_ID in the project root .env")

    def add_frame(self, frame: np.ndarray) -> None:
        ok, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 82])
        if not ok:
            return
        data = encoded.tobytes()
        self.frame_buffer.append(data)
        for clip in list(self.pending_clips):
            clip["frames"].append(data)
            clip["remaining"] -= 1
            if clip["remaining"] <= 0:
                self._write_clip(clip)
                self.pending_clips.remove(clip)

    def handle_alert(self, event: dict, frame: np.ndarray) -> None:
        now = datetime.now(timezone.utc)
        stamp = now.strftime("%Y%m%d_%H%M%S_%f")
        stem = f"{stamp}_{event['event_type']}_{event['track_id']}"
        snapshot = self.alerts_dir / f"{stem}.jpg"
        clip_path = self.alerts_dir / f"{stem}.mp4"
        if not cv2.imwrite(str(snapshot), frame):
            logger.warning("Could not save alert snapshot: %s", snapshot)

        event["timestamp"] = now.isoformat()
        self.db.execute(
            "INSERT INTO events (timestamp, event_type, object_class, track_id, confidence, snapshot_path) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (event["timestamp"], event["event_type"], event["object_class"],
             event["track_id"], event["confidence"], str(snapshot.resolve())),
        )
        self.db.commit()
        self.pending_clips.append({
            "path": clip_path,
            "frames": list(self.frame_buffer),
            "remaining": self.post_frames,
        })
        self._send_telegram(event, snapshot, now)

    def _write_clip(self, clip: dict) -> None:
        if not clip["frames"]:
            return
        first = cv2.imdecode(np.frombuffer(clip["frames"][0], np.uint8), cv2.IMREAD_COLOR)
        if first is None:
            return
        height, width = first.shape[:2]
        writer = cv2.VideoWriter(
            str(clip["path"]), cv2.VideoWriter_fourcc(*"mp4v"), self.fps, (width, height)
        )
        if not writer.isOpened():
            logger.warning("Could not create alert clip: %s", clip["path"])
            return
        try:
            for data in clip["frames"]:
                frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
                if frame is not None and frame.shape[:2] == (height, width):
                    writer.write(frame)
        finally:
            writer.release()

    def _send_telegram(self, event: dict, snapshot: Path, now: datetime) -> None:
        if not self.telegram_token or not self.chat_id:
            return
        with self.telegram_lock:
            current = time.monotonic()
            cooldown = float(self.config["alert_cooldown_seconds"])
            if current - self.last_telegram_time < cooldown:
                return
            self.last_telegram_time = current
        threading.Thread(
            target=self._telegram_request, args=(event, snapshot, now), daemon=True
        ).start()

    def _telegram_request(self, event: dict, snapshot: Path, now: datetime) -> None:
        caption = f"{event['event_type']} alert: {event['object_class']} at {now:%Y-%m-%d %H:%M:%S} UTC"
        try:
            with snapshot.open("rb") as photo:
                response = requests.post(
                    f"https://api.telegram.org/bot{self.telegram_token}/sendPhoto",
                    data={"chat_id": self.chat_id, "caption": caption},
                    files={"photo": photo},
                    timeout=(3, 10),
                )
            response.raise_for_status()
            if not response.json().get("ok"):
                raise RuntimeError("Telegram rejected the alert")
        except (requests.RequestException, OSError, ValueError, RuntimeError) as error:
            logger.warning("Telegram alert failed: %s", error)

    def close(self) -> None:
        for clip in self.pending_clips:
            self._write_clip(clip)
        self.pending_clips.clear()
        self.db.close()
