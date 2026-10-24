"""
ai_model/detector.py
─────────────────────
DroneObjectDetector — the primary public class for the AI Drone Surveillance
project.  This is the single module the FastAPI backend imports.

Backend import example
----------------------
    from ai_model.detector import DroneObjectDetector

    detector = DroneObjectDetector()                   # sane defaults
    annotated_frame, detections = detector.process_frame(frame)

Detection schema (list of dicts)
---------------------------------
    [
        {
            "class":      "person",          # str  — COCO class name
            "confidence": 0.87,              # float in [0.0, 1.0]
            "bbox":       [x1, y1, x2, y2]  # int pixel coords, xyxy format
        },
        ...
    ]

Notes
------
- Uses Ultralytics YOLOv8n by default (auto-downloaded on first run ≈ 6 MB).
- CPU inference by default; CUDA accelerated when available and requested.
- Does NOT perform multi-frame tracking, face recognition, or behavioural
  risk assessment — those are separate concerns (see events.py for simple
  rule-based event flags).
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np

from .utils import (
    FrameValidator,
    FPSCounter,
    draw_detections,
    overlay_stats,
    get_device,
)

# ── optional import guard: Ultralytics may not be installed in CI ─────────────
try:
    from ultralytics import YOLO
    _YOLO_AVAILABLE = True
except ImportError:  # pragma: no cover
    _YOLO_AVAILABLE = False

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# COCO class index → name map (subset relevant to drone surveillance)
# ─────────────────────────────────────────────────────────────────────────────

SUPPORTED_CLASSES: list[str] = [
    "person",
    "car",
    "motorcycle",
    "bus",
    "truck",
]

# Full COCO class list (80 classes) — only the indices we care about
_COCO_NAMES: dict[int, str] = {
    0:  "person",
    1:  "bicycle",
    2:  "car",
    3:  "motorcycle",
    5:  "bus",
    7:  "truck",
    # extend here if you add more target classes later
}

# Build reverse map at module load time
_NAME_TO_COCO_ID: dict[str, int] = {v: k for k, v in _COCO_NAMES.items()}


# ─────────────────────────────────────────────────────────────────────────────
# Main detector class
# ─────────────────────────────────────────────────────────────────────────────

class DroneObjectDetector:
    """
    Wraps a YOLOv8 model to provide a clean, reusable interface for
    single-frame object detection in drone surveillance footage.

    Parameters
    ----------
    model_path : str | Path
        Path to a `.pt` weights file, or a Ultralytics model shorthand
        (e.g. ``"yolov8n.pt"``) which is auto-downloaded on first use.
    conf_threshold : float
        Minimum confidence score to include a detection (0.0–1.0).
    device : str
        Inference device: ``"auto"``, ``"cpu"``, ``"cuda"``, ``"cuda:0"``,
        ``"mps"``.  Defaults to ``"auto"`` (GPU if available, else CPU).
    target_classes : list[str] | None
        Names of COCO classes to detect.  ``None`` means use
        ``SUPPORTED_CLASSES`` (person, car, motorcycle, bus, truck).
    iou_threshold : float
        NMS IoU threshold passed to the YOLO model.
    verbose : bool
        When ``False`` (default), Ultralytics internal logs are suppressed.

    Raises
    ------
    RuntimeError
        If Ultralytics is not installed.
    FileNotFoundError
        If *model_path* points to a local file that does not exist.
    """

    def __init__(
        self,
        model_path: str | Path = "yolov8n.pt",
        conf_threshold: float = 0.45,
        device: str = "auto",
        target_classes: list[str] | None = None,
        iou_threshold: float = 0.45,
        verbose: bool = False,
    ) -> None:
        if not _YOLO_AVAILABLE:
            raise RuntimeError(
                "Ultralytics is not installed.\n"
                "Run:  pip install ultralytics"
            )

        # ── resolve model path ────────────────────────────────────────────────
        self._model_path = Path(model_path)
        self._validate_model_path(self._model_path)

        # ── validate thresholds ───────────────────────────────────────────────
        if not 0.0 <= conf_threshold <= 1.0:
            raise ValueError(f"conf_threshold must be in [0, 1], got {conf_threshold}")
        if not 0.0 <= iou_threshold <= 1.0:
            raise ValueError(f"iou_threshold must be in [0, 1], got {iou_threshold}")

        self.conf_threshold = float(conf_threshold)
        self.iou_threshold  = float(iou_threshold)

        # ── resolve target classes ────────────────────────────────────────────
        if target_classes is None:
            target_classes = SUPPORTED_CLASSES
        self.target_classes: list[str] = self._validate_classes(target_classes)

        # ── map class names → COCO integer ids for YOLO filtering ─────────────
        self._class_ids: list[int] = [
            _NAME_TO_COCO_ID[c]
            for c in self.target_classes
            if c in _NAME_TO_COCO_ID
        ]

        # ── resolve device ────────────────────────────────────────────────────
        self.device = get_device(device)

        # ── load model ────────────────────────────────────────────────────────
        logger.info("Loading model: %s on device=%s", self._model_path, self.device)
        self._model = YOLO(str(self._model_path), verbose=verbose)
        self._model.to(self.device)

        # ── performance counters ──────────────────────────────────────────────
        self._fps_counter  = FPSCounter(window=30)
        self._total_dets   = 0
        self._frames_run   = 0

        logger.info(
            "DroneObjectDetector ready | model=%s | conf=%.2f | device=%s | classes=%s",
            self._model_path.name,
            self.conf_threshold,
            self.device,
            self.target_classes,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Primary public interface
    # ─────────────────────────────────────────────────────────────────────────

    def process_frame(
        self,
        frame: np.ndarray,
        *,
        draw: bool = True,
    ) -> Tuple[np.ndarray, List[dict]]:
        """
        Run detection on a single BGR frame.

        Parameters
        ----------
        frame : np.ndarray
            A BGR image as returned by ``cv2.VideoCapture.read()`` or any
            compatible source.  Shape must be (H, W, 3).
        draw : bool
            When ``True`` (default), returns an annotated copy of *frame*
            with bounding boxes and labels drawn.  When ``False``, returns
            the original frame unchanged (useful for headless / API mode).

        Returns
        -------
        annotated_frame : np.ndarray
            A copy of *frame* with bounding boxes and stats overlay.
            If *draw* is ``False``, this is the unmodified input frame.
        detections : list[dict]
            List of detection dicts:
            ``{"class": str, "confidence": float, "bbox": [x1, y1, x2, y2]}``
            *bbox* values are integer pixel coordinates in xyxy format.

        Notes
        -----
        - Returns ``(frame, [])`` if frame validation fails — never raises
          on bad frames, so the caller's video loop stays alive.
        - Processing time and FPS are tracked internally; call
          ``get_stats()`` to retrieve them.
        """
        # ── validate frame ────────────────────────────────────────────────────
        ok, reason = FrameValidator.validate(frame)
        if not ok:
            logger.warning("Skipping invalid frame: %s", reason)
            _safe = frame if isinstance(frame, np.ndarray) else np.zeros((480, 640, 3), np.uint8)
            return _safe, []

        self._fps_counter.tick_start()

        # ── inference ─────────────────────────────────────────────────────────
        try:
            results = self._model.predict(
                source=frame,
                conf=self.conf_threshold,
                iou=self.iou_threshold,
                classes=self._class_ids if self._class_ids else None,
                verbose=False,
                stream=False,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Model inference failed: %s", exc)
            proc_ms = self._fps_counter.tick_end()
            return frame, []

        proc_ms = self._fps_counter.tick_end()

        # ── parse results ─────────────────────────────────────────────────────
        detections = self._parse_results(results)
        self._total_dets  += len(detections)
        self._frames_run  += 1

        # ── annotate ──────────────────────────────────────────────────────────
        if draw:
            annotated = draw_detections(frame, detections)
            annotated = overlay_stats(
                annotated,
                fps=self._fps_counter.fps,
                proc_ms=proc_ms,
                detection_count=len(detections),
            )
        else:
            annotated = frame

        return annotated, detections

    # ─────────────────────────────────────────────────────────────────────────
    # Stats & info
    # ─────────────────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        """
        Return cumulative performance statistics.

        Returns
        -------
        dict with keys:
            fps          : float — rolling average frames per second
            avg_proc_ms  : float — rolling average inference time per frame (ms)
            total_frames : int   — total frames processed since instantiation
            total_dets   : int   — total detections across all frames
            avg_dets_per_frame : float
        """
        stats = self._fps_counter.summary()
        stats["total_dets"]         = self._total_dets
        stats["avg_dets_per_frame"] = (
            round(self._total_dets / self._frames_run, 2)
            if self._frames_run > 0 else 0.0
        )
        return stats

    def reset_stats(self) -> None:
        """Reset all performance counters."""
        self._fps_counter  = FPSCounter(window=30)
        self._total_dets   = 0
        self._frames_run   = 0

    def __repr__(self) -> str:
        return (
            f"DroneObjectDetector("
            f"model={self._model_path.name!r}, "
            f"conf={self.conf_threshold}, "
            f"device={self.device!r}, "
            f"classes={self.target_classes})"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _validate_model_path(model_path: Path) -> None:
        """
        Allow Ultralytics shorthand names (e.g. 'yolov8n.pt') to pass through;
        only fail on explicit local paths that do not exist.
        """
        _known_shorthand = {
            "yolov8n.pt", "yolov8s.pt", "yolov8m.pt",
            "yolov8l.pt", "yolov8x.pt",
        }
        name = model_path.name
        if name in _known_shorthand:
            return   # Ultralytics will download this automatically
        if model_path.is_absolute() or os.sep in str(model_path):
            if not model_path.exists():
                raise FileNotFoundError(
                    f"Model weights not found: {model_path}\n"
                    "Tip: use 'yolov8n.pt' to auto-download the pretrained model."
                )

    @staticmethod
    def _validate_classes(classes: list[str]) -> list[str]:
        """Warn about unsupported class names and return the valid subset."""
        valid, invalid = [], []
        for cls in classes:
            if cls in _NAME_TO_COCO_ID:
                valid.append(cls)
            else:
                invalid.append(cls)
        if invalid:
            logger.warning(
                "Unsupported class names ignored: %s. "
                "Supported: %s",
                invalid, list(_NAME_TO_COCO_ID.keys()),
            )
        if not valid:
            logger.warning("No valid target classes — detecting all COCO classes.")
        return valid

    def _parse_results(self, results: list) -> List[dict]:
        """
        Convert raw Ultralytics Results objects into the agreed detection schema.

        Returns
        -------
        list[dict] — each element:
            {
                "class":      str,
                "confidence": float,   # rounded to 4 d.p.
                "bbox":       [x1, y1, x2, y2]  # int xyxy pixels
            }
        """
        detections: List[dict] = []

        for result in results:
            if result.boxes is None:
                continue

            boxes = result.boxes

            for i in range(len(boxes)):
                # xyxy pixel coords
                xyxy = boxes.xyxy[i].cpu().numpy().astype(float)
                x1, y1, x2, y2 = (int(round(v)) for v in xyxy)

                conf     = float(boxes.conf[i].cpu().numpy())
                cls_id   = int(boxes.cls[i].cpu().numpy())
                cls_name = _COCO_NAMES.get(cls_id, f"class_{cls_id}")

                # skip if class not in our target list (belt-and-suspenders)
                if self.target_classes and cls_name not in self.target_classes:
                    continue

                detections.append({
                    "class":      cls_name,
                    "confidence": round(conf, 4),
                    "bbox":       [x1, y1, x2, y2],
                })

        return detections
