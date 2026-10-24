import sys
import logging
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import cv2

from backend.app.detector.base import BaseDetector
from backend.app.detector.mock_detector import MockDetector
from backend.app.config import settings

logger = logging.getLogger(__name__)


class YOLOAdapter(BaseDetector):
    """
    Adapter that integrates with the shared YOLOv8 AI model from `ai_model/`
    without duplicating model code. If `ai_model` is unavailable, it gracefully
    falls back to MockDetector.
    """

    def __init__(self, model_path: Optional[str] = None):
        self._fallback_detector = MockDetector()
        self._custom_detector = None
        self._model = None
        self._is_yolo_active = False

        self._initialize(model_path)

    def _initialize(self, model_path: Optional[str]):
        # Add parent directory of backend (repository root) to sys.path if not present
        repo_root = Path(__file__).resolve().parent.parent.parent.parent
        if str(repo_root) not in sys.path:
            sys.path.insert(0, str(repo_root))

        # Check if ai_model module is importable
        try:
            import ai_model  # noqa: F401
            # Try to see if ai_model exposes a detector or process_frame
            if hasattr(ai_model, "detector"):
                detector_module = getattr(ai_model, "detector")
                if hasattr(detector_module, "YOLOv8Detector"):
                    self._custom_detector = detector_module.YOLOv8Detector()
                    self._is_yolo_active = True
                    logger.info("Successfully loaded YOLOv8Detector from ai_model.detector")
                    return
                elif hasattr(detector_module, "process_frame"):
                    self._custom_detector = detector_module
                    self._is_yolo_active = True
                    logger.info("Successfully loaded process_frame from ai_model.detector")
                    return
        except ImportError as e:
            logger.info(f"ai_model package not importable: {e}")

        # Alternatively, if ultralytics is installed and a model path or YOLO is requested:
        target_model = model_path or settings.YOLO_MODEL_PATH
        if settings.DETECTOR_TYPE == "yolo" or target_model:
            try:
                from ultralytics import YOLO
                chosen_weights = target_model if target_model else "yolov8n.pt"
                logger.info(f"Loading YOLO model with weights: {chosen_weights}")
                self._model = YOLO(chosen_weights)
                self._is_yolo_active = True
                logger.info("YOLOv8 model loaded successfully")
                return
            except Exception as e:
                logger.warning(f"Could not initialize YOLO model: {e}. Falling back to MockDetector.")

        logger.info("YOLOAdapter defaulting to MockDetector mode.")

    def process_frame(
        self, frame: np.ndarray
    ) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        if not self._is_yolo_active:
            return self._fallback_detector.process_frame(frame)

        # If custom detector from ai_model provides process_frame
        if self._custom_detector:
            try:
                res = self._custom_detector.process_frame(frame)
                if isinstance(res, tuple) and len(res) == 2:
                    return res
            except Exception as e:
                logger.error(f"Error calling ai_model detector: {e}")
                return self._fallback_detector.process_frame(frame)

        # If running via ultralytics model
        if self._model:
            try:
                results = self._model(frame, verbose=False)
                detections: List[Dict[str, Any]] = []
                annotated_frame = frame.copy()

                if results and len(results) > 0:
                    r = results[0]
                    # ultralytics plot() returns annotated frame
                    annotated_frame = r.plot()
                    names = r.names
                    for box in r.boxes:
                        cls_id = int(box.cls[0].item())
                        cls_name = names.get(cls_id, str(cls_id))
                        conf = float(box.conf[0].item())
                        xyxy = [float(coord) for coord in box.xyxy[0].tolist()]

                        detections.append({
                            "class": cls_name,
                            "confidence": round(conf, 2),
                            "bbox": xyxy,
                        })

                return annotated_frame, detections
            except Exception as e:
                logger.error(f"Error during YOLO inference: {e}")
                return self._fallback_detector.process_frame(frame)

        return self._fallback_detector.process_frame(frame)
