"""
ai_model/utils.py
─────────────────
Shared utility helpers for the AI Drone Surveillance detection pipeline.

Responsibilities
----------------
- FrameValidator   : sanity-checks incoming numpy frames before inference
- FPSCounter       : lightweight rolling-average FPS & processing-time tracker
- draw_detections  : renders bounding boxes + labels on an annotated frame
- get_device       : auto-select CUDA / MPS / CPU inference device

No business logic lives here — keep it pure utility.
"""

from __future__ import annotations

import time
from collections import deque
from typing import List

import cv2
import numpy as np


# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

# Colours for each supported COCO class (BGR)
CLASS_COLOURS: dict[str, tuple[int, int, int]] = {
    "person":     (0,   255,  80),   # bright green
    "car":        (255, 180,   0),   # amber
    "motorcycle": (0,   180, 255),   # sky blue
    "bus":        (255,  60, 200),   # magenta
    "truck":      (60,  200, 255),   # cyan
}
DEFAULT_COLOUR = (200, 200, 200)     # grey fallback

FONT          = cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE    = 0.55
FONT_THICK    = 1
BOX_THICK     = 2
LABEL_PAD     = 4   # pixels of padding around label text


# ─────────────────────────────────────────────────────────────────────────────
# Frame validation
# ─────────────────────────────────────────────────────────────────────────────

class FrameValidator:
    """Validates that a raw frame is safe to feed into the model."""

    MIN_DIM = 32   # anything smaller is not meaningful

    @classmethod
    def validate(cls, frame: object) -> tuple[bool, str]:
        """
        Returns (ok: bool, reason: str).
        Call before every inference to protect against:
          - None frames (camera drop, end-of-stream)
          - Non-numpy objects
          - Zero-area or 1-D arrays
          - Channels other than 1, 3, or 4
        """
        if frame is None:
            return False, "Frame is None (end-of-stream or camera failure)"

        if not isinstance(frame, np.ndarray):
            return False, f"Expected np.ndarray, got {type(frame).__name__}"

        if frame.ndim < 2:
            return False, f"Frame has {frame.ndim} dimension(s); need at least 2"

        h, w = frame.shape[:2]
        if h < cls.MIN_DIM or w < cls.MIN_DIM:
            return False, f"Frame too small ({w}×{h}); minimum is {cls.MIN_DIM}px"

        if frame.ndim == 3 and frame.shape[2] not in (1, 3, 4):
            return False, f"Unexpected channel count: {frame.shape[2]}"

        if frame.size == 0:
            return False, "Frame has zero pixels"

        return True, "ok"


# ─────────────────────────────────────────────────────────────────────────────
# FPS / timing tracker
# ─────────────────────────────────────────────────────────────────────────────

class FPSCounter:
    """
    Rolling-window FPS counter and per-frame processing-time tracker.

    Usage
    -----
        fps_counter = FPSCounter(window=30)
        t0 = fps_counter.tick_start()
        # ... do work ...
        proc_ms = fps_counter.tick_end()
        print(fps_counter.fps, fps_counter.avg_proc_ms)
    """

    def __init__(self, window: int = 30) -> None:
        self._window  = window
        self._times: deque[float] = deque(maxlen=window)   # wall-clock timestamps
        self._procs: deque[float] = deque(maxlen=window)   # processing durations (s)
        self._start: float | None = None
        self._frame_count: int = 0

    # ── public interface ──────────────────────────────────────────────────────

    def tick_start(self) -> float:
        """Mark the beginning of frame processing. Returns current time."""
        self._start = time.perf_counter()
        return self._start

    def tick_end(self) -> float:
        """
        Mark the end of frame processing.
        Returns processing time in **milliseconds** for this frame.
        """
        now = time.perf_counter()
        if self._start is None:
            self._start = now
        elapsed = now - self._start
        self._times.append(now)
        self._procs.append(elapsed)
        self._frame_count += 1
        self._start = None
        return elapsed * 1000.0   # ms

    @property
    def fps(self) -> float:
        """Rolling average FPS over the last *window* frames."""
        if len(self._times) < 2:
            return 0.0
        span = self._times[-1] - self._times[0]
        return (len(self._times) - 1) / span if span > 0 else 0.0

    @property
    def avg_proc_ms(self) -> float:
        """Average processing time (ms) over the rolling window."""
        if not self._procs:
            return 0.0
        return (sum(self._procs) / len(self._procs)) * 1000.0

    @property
    def total_frames(self) -> int:
        return self._frame_count

    def summary(self) -> dict:
        return {
            "fps":            round(self.fps, 2),
            "avg_proc_ms":    round(self.avg_proc_ms, 2),
            "total_frames":   self._frame_count,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Annotation helpers
# ─────────────────────────────────────────────────────────────────────────────

def draw_detections(
    frame: np.ndarray,
    detections: List[dict],
    *,
    show_conf: bool = True,
) -> np.ndarray:
    """
    Draw bounding boxes and labels on *frame* (in-place copy returned).

    Parameters
    ----------
    frame      : BGR numpy array
    detections : list of dicts from DroneObjectDetector.process_frame()
                 Each dict: {class: str, confidence: float, bbox: [x1,y1,x2,y2]}
    show_conf  : whether to append confidence % to the label

    Returns
    -------
    Annotated BGR frame (same shape as input).
    """
    out = frame.copy()

    for det in detections:
        cls_name   = det.get("class", "?")
        confidence = det.get("confidence", 0.0)
        x1, y1, x2, y2 = (int(v) for v in det["bbox"])

        colour = CLASS_COLOURS.get(cls_name, DEFAULT_COLOUR)

        # Bounding box
        cv2.rectangle(out, (x1, y1), (x2, y2), colour, BOX_THICK)

        # Label text
        if show_conf:
            label = f"{cls_name} {confidence:.0%}"
        else:
            label = cls_name

        (tw, th), baseline = cv2.getTextSize(label, FONT, FONT_SCALE, FONT_THICK)

        # Filled label background
        label_y = max(y1 - LABEL_PAD, th + LABEL_PAD)
        cv2.rectangle(
            out,
            (x1, label_y - th - LABEL_PAD),
            (x1 + tw + LABEL_PAD * 2, label_y + baseline),
            colour,
            cv2.FILLED,
        )

        # Label text (dark contrast)
        cv2.putText(
            out, label,
            (x1 + LABEL_PAD, label_y),
            FONT, FONT_SCALE,
            (0, 0, 0),   # black text on coloured background
            FONT_THICK,
            cv2.LINE_AA,
        )

    return out


def overlay_stats(
    frame: np.ndarray,
    fps: float,
    proc_ms: float,
    detection_count: int,
    *,
    event_flags: List[str] | None = None,
) -> np.ndarray:
    """
    Draws a semi-transparent HUD in the top-left corner with performance stats.

    Parameters
    ----------
    frame           : BGR annotated frame
    fps             : rolling FPS value
    proc_ms         : last frame processing time in ms
    detection_count : number of detections in this frame
    event_flags     : list of active event label strings (or None)
    """
    lines = [
        f"FPS: {fps:5.1f}",
        f"Proc: {proc_ms:5.1f} ms",
        f"Detections: {detection_count}",
    ]
    if event_flags:
        for flag in event_flags:
            lines.append(f"[EVENT] {flag}")

    x, y0, dy = 8, 24, 22
    bg_h = dy * len(lines) + 8
    bg_w = 220

    # semi-transparent background rectangle
    roi = frame[0: bg_h, 0: bg_w]
    overlay = roi.copy()
    cv2.rectangle(overlay, (0, 0), (bg_w, bg_h), (0, 0, 0), cv2.FILLED)
    cv2.addWeighted(overlay, 0.55, roi, 0.45, 0, roi)
    frame[0: bg_h, 0: bg_w] = roi

    for i, line in enumerate(lines):
        colour = (0, 255, 200) if "[EVENT]" not in line else (0, 100, 255)
        cv2.putText(
            frame, line,
            (x, y0 + i * dy),
            FONT, FONT_SCALE,
            colour,
            FONT_THICK,
            cv2.LINE_AA,
        )

    return frame


# ─────────────────────────────────────────────────────────────────────────────
# Device selection
# ─────────────────────────────────────────────────────────────────────────────

def get_device(preference: str = "auto") -> str:
    """
    Resolve the inference device string understood by Ultralytics / PyTorch.

    Parameters
    ----------
    preference : "auto" | "cpu" | "cuda" | "cuda:0" | "mps"

    Returns
    -------
    A valid device string.  Falls back to "cpu" if the requested
    device is unavailable.
    """
    pref = preference.lower().strip()

    if pref == "cpu":
        return "cpu"

    try:
        import torch

        if pref in ("cuda", "gpu") or pref.startswith("cuda:"):
            if torch.cuda.is_available():
                dev = "cuda" if pref in ("cuda", "gpu", "auto") else pref
                print(f"[device] CUDA available — using {dev}")
                return dev
            else:
                print("[device] CUDA requested but unavailable — falling back to CPU")
                return "cpu"

        if pref == "mps":
            if torch.backends.mps.is_available():
                print("[device] Apple MPS available — using mps")
                return "mps"
            else:
                print("[device] MPS requested but unavailable — falling back to CPU")
                return "cpu"

        if pref == "auto":
            if torch.cuda.is_available():
                print("[device] Auto-selected CUDA")
                return "cuda"
            if torch.backends.mps.is_available():
                print("[device] Auto-selected MPS")
                return "mps"
            print("[device] Auto-selected CPU")
            return "cpu"

    except ImportError:
        print("[device] PyTorch not found — defaulting to cpu")
        return "cpu"

    return "cpu"
