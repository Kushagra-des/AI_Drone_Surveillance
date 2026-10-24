from backend.app.detector.base import BaseDetector
from backend.app.detector.mock_detector import MockDetector
from backend.app.detector.yolo_adapter import YOLOAdapter
from backend.app.config import settings


def get_detector() -> BaseDetector:
    """Factory to retrieve the configured detector implementation."""
    if settings.DETECTOR_TYPE == "yolo":
        return YOLOAdapter(model_path=settings.YOLO_MODEL_PATH)
    return MockDetector()


__all__ = ["BaseDetector", "MockDetector", "YOLOAdapter", "get_detector"]
