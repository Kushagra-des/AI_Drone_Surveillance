"""
ai_model — drone surveillance object detection package.

Public API
----------
    from ai_model.detector import DroneObjectDetector, YOLOv8Detector, process_frame
    from ai_model.events   import DetectionEventEngine, DetectionEventConfig, RestrictedZone
"""

from . import detector
from . import events
from . import utils
from .detector import (
    DroneObjectDetector,
    YOLOv8Detector,
    process_frame,
    SUPPORTED_CLASSES,
)
from .events import (
    DetectionEventEngine,
    DetectionEventConfig,
    RestrictedZone,
)

__all__ = [
    "detector",
    "events",
    "utils",
    "DroneObjectDetector",
    "YOLOv8Detector",
    "process_frame",
    "SUPPORTED_CLASSES",
    "DetectionEventEngine",
    "DetectionEventConfig",
    "RestrictedZone",
]
__version__ = "0.1.0"
