import time
import uuid
import threading
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Generator
import cv2
import numpy as np
from fastapi import HTTPException

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.models.session import MonitoringSession
from backend.app.models.detection import DetectionRecord
from backend.app.detector import get_detector, BaseDetector
from backend.app.services.connection_manager import manager
from backend.app.services.alert_service import alert_service
from backend.app.services.video_storage import video_storage

logger = logging.getLogger(__name__)


class SurveillancePipeline:
    """
    Central background surveillance processing service.
    Coordinates video capture, detector inference, MJPEG frame buffer,
    database persistence, and WebSocket broadcasting on a dedicated thread.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._frame_condition = threading.Condition()
        self._worker_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

        self.is_active: bool = False
        self.session_id: Optional[str] = None
        self.source_type: Optional[str] = None
        self.source_id: Optional[str] = None
        self.start_time: Optional[datetime] = None

        self.latest_jpeg: Optional[bytes] = None
        self.fps: float = 0.0
        self.total_frames: int = 0
        self.total_detections: int = 0

        self.detector: BaseDetector = get_detector()

    def start_session(self, source_type: str, source: str) -> MonitoringSession:
        """
        Starts a new monitoring session. Rejects if a session is already active.
        Strictly validates source access.
        """
        with self._lock:
            if self.is_active:
                raise HTTPException(
                    status_code=409,
                    detail=f"Monitoring session '{self.session_id}' is already running. Stop it before starting a new one.",
                )

            # Validate sources strictly
            actual_capture_source: Any = None
            if source_type == "webcam":
                if not source.isdigit():
                    raise HTTPException(
                        status_code=400,
                        detail="Webcam source must be an integer index (e.g. '0').",
                    )
                camera_idx = int(source)
                if camera_idx not in settings.ALLOWED_CAMERA_SOURCES:
                    allowed_str = ", ".join(str(s) for s in settings.ALLOWED_CAMERA_SOURCES)
                    raise HTTPException(
                        status_code=403,
                        detail=f"Camera index {camera_idx} is not in allowed camera sources [{allowed_str}].",
                    )
                actual_capture_source = camera_idx

            elif source_type == "video_file":
                # Validate video file exists in authorized uploads directory
                video_path = video_storage.resolve_video_path(source)
                actual_capture_source = str(video_path)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported source type '{source_type}'. Allowed: 'webcam', 'video_file'.",
                )

            # Test opening capture before creating session
            test_cap = cv2.VideoCapture(actual_capture_source)
            if not test_cap.isOpened():
                test_cap.release()
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to open video capture source: {source}",
                )
            test_cap.release()

            # Create DB session record
            new_session_id = f"session_{uuid.uuid4().hex[:12]}"
            db = SessionLocal()
            try:
                db_session = MonitoringSession(
                    session_id=new_session_id,
                    source_type=source_type,
                    source_id=source,
                    started_at=datetime.now(timezone.utc),
                    status="active",
                    total_frames=0,
                    total_detections=0,
                )
                db.add(db_session)
                db.commit()
                db.refresh(db_session)
            finally:
                db.close()

            # Initialize pipeline state
            self.session_id = new_session_id
            self.source_type = source_type
            self.source_id = source
            self.start_time = datetime.now(timezone.utc)
            self.total_frames = 0
            self.total_detections = 0
            self.fps = 0.0
            self.latest_jpeg = None
            self.is_active = True
            self._stop_event.clear()

            # Reload detector according to config
            self.detector = get_detector()

            # Start worker thread off HTTP loop
            self._worker_thread = threading.Thread(
                target=self._processing_worker,
                args=(actual_capture_source, new_session_id, source),
                daemon=True,
                name=f"Worker-{new_session_id}",
            )
            self._worker_thread.start()
            logger.info(f"Started monitoring session {new_session_id} on {source}")

            return db_session

    def stop_session(self) -> Dict[str, Any]:
        """
        Stops the active monitoring session and releases all resources.
        """
        with self._lock:
            if not self.is_active:
                raise HTTPException(
                    status_code=400, detail="No active monitoring session to stop."
                )

            session_id = self.session_id
            total_frames = self.total_frames
            total_detections = self.total_detections

            self._stop_event.set()
            self.is_active = False

        # Wait for worker thread to terminate cleanly
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=3.0)

        # Notify any waiting frame listeners to exit
        with self._frame_condition:
            self._frame_condition.notify_all()

        # Update DB session record
        db = SessionLocal()
        try:
            db_session = (
                db.query(MonitoringSession)
                .filter(MonitoringSession.session_id == session_id)
                .first()
            )
            if db_session:
                db_session.status = "stopped"
                db_session.ended_at = datetime.now(timezone.utc)
                db_session.total_frames = total_frames
                db_session.total_detections = total_detections
                db.commit()
        finally:
            db.close()

        logger.info(f"Stopped monitoring session {session_id}")
        return {
            "message": "Monitoring session stopped successfully.",
            "session_id": session_id,
            "status": "stopped",
            "total_frames": total_frames,
            "total_detections": total_detections,
        }

    def _processing_worker(
        self, capture_source: Any, session_id: str, source_display_id: str
    ):
        """
        Dedicated processing loop running off the HTTP event loop.
        Extracts frames, runs inference, saves detections, notifies WebSocket,
        and encodes latest frame for MJPEG stream.
        """
        cap = cv2.VideoCapture(capture_source)
        target_fps = max(1, settings.STREAM_FPS)
        frame_delay = 1.0 / target_fps
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), settings.STREAM_JPEG_QUALITY]

        frame_count = 0
        det_count = 0
        fps_timer = time.time()
        fps_frame_counter = 0

        db = SessionLocal()

        try:
            while not self._stop_event.is_set():
                start_loop = time.time()

                ret, frame = cap.read()
                if not ret:
                    # If reading a video file, loop back to the beginning for continuous surveillance
                    if isinstance(capture_source, str):
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = cap.read()
                    if not ret:
                        logger.warning("Failed to retrieve frame from source; sleeping briefly.")
                        time.sleep(0.1)
                        continue

                frame_count += 1
                fps_frame_counter += 1

                # Calculate real-time FPS every second
                now_time = time.time()
                if now_time - fps_timer >= 1.0:
                    self.fps = round(fps_frame_counter / (now_time - fps_timer), 1)
                    fps_frame_counter = 0
                    fps_timer = now_time

                # Run detector inference
                annotated_frame, detections = self.detector.process_frame(frame)
                det_count += len(detections)

                # Persist detections in DB
                detection_ids = []
                now_dt = datetime.now(timezone.utc)
                if detections:
                    records = []
                    for det in detections:
                        rec = DetectionRecord(
                            session_id=session_id,
                            timestamp=now_dt,
                            class_name=det["class"],
                            confidence=det["confidence"],
                            bbox_x1=det["bbox"][0],
                            bbox_y1=det["bbox"][1],
                            bbox_x2=det["bbox"][2],
                            bbox_y2=det["bbox"][3],
                            source_id=source_display_id,
                        )
                        records.append(rec)
                    db.add_all(records)
                    db.commit()
                    for r in records:
                        db.refresh(r)
                        detection_ids.append(r.id)

                    # Evaluate alerts
                    alerts = alert_service.evaluate_detections(
                        db=db,
                        session_id=session_id,
                        source_id=source_display_id,
                        detections=detections,
                        detection_ids=detection_ids,
                    )

                    # Broadcast alerts over WebSocket
                    for alert in alerts:
                        manager.broadcast_threadsafe({
                            "event": "alert",
                            "alert": {
                                "id": alert.id,
                                "session_id": alert.session_id,
                                "timestamp": alert.timestamp.isoformat(),
                                "alert_type": alert.alert_type,
                                "severity": alert.severity,
                                "message": alert.message,
                                "detection_id": alert.detection_id,
                                "source_id": alert.source_id,
                            },
                        })

                # Broadcast real-time detection update over WebSocket
                manager.broadcast_threadsafe({
                    "event": "detection_update",
                    "session_id": session_id,
                    "source_id": source_display_id,
                    "timestamp": now_dt.isoformat(),
                    "frame_index": frame_count,
                    "detections": detections,
                })

                # Encode annotated frame to JPEG for MJPEG stream buffer
                success, buffer = cv2.imencode(".jpg", annotated_frame, encode_param)
                if success:
                    jpeg_bytes = buffer.tobytes()
                    with self._frame_condition:
                        self.latest_jpeg = jpeg_bytes
                        self.total_frames = frame_count
                        self.total_detections = det_count
                        self._frame_condition.notify_all()

                # Maintain target framerate
                elapsed = time.time() - start_loop
                sleep_time = frame_delay - elapsed
                if sleep_time > 0:
                    time.sleep(sleep_time)

        except Exception as e:
            logger.error(f"Error in processing worker loop: {e}", exc_info=True)
        finally:
            cap.release()
            db.close()
            logger.info("Video capture released and worker thread completed.")

    def get_stream_generator(self) -> Generator[bytes, None, None]:
        """
        Yields multipart MJPEG chunks for GET /api/video-feed.
        Shares the single processed frame buffer.
        """
        placeholder_sent = False

        while self.is_active and not self._stop_event.is_set():
            with self._frame_condition:
                # Wait for next frame notification or timeout
                notified = self._frame_condition.wait(timeout=1.0)
                if not notified or self.latest_jpeg is None:
                    continue

                frame_data = self.latest_jpeg

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_data + b"\r\n"
            )

        # If not active, yield a static placeholder or stop
        if not self.is_active and not placeholder_sent:
            placeholder = self._create_placeholder_frame("NO ACTIVE SURVEILLANCE FEED")
            success, buffer = cv2.imencode(".jpg", placeholder)
            if success:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
                )

    def _create_placeholder_frame(self, message: str) -> np.ndarray:
        """Creates a black frame with a status message."""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(
            frame,
            message,
            (100, 240),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 255),
            2,
            cv2.LINE_AA,
        )
        return frame

    def get_active_session_info(self) -> Optional[Dict[str, Any]]:
        """Returns metadata for the currently active session, or None."""
        if not self.is_active:
            return None

        return {
            "session_id": self.session_id,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "started_at": self.start_time,
            "status": "active",
            "total_frames": self.total_frames,
            "total_detections": self.total_detections,
            "fps": self.fps,
        }


pipeline = SurveillancePipeline()
