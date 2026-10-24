"""
ai_model — drone surveillance object detection package.

Public API
----------
    from ai_model.detector import DroneObjectDetector
    from ai_model.events   import DetectionEventEngine
"""

from .detector import DroneObjectDetector, SUPPORTED_CLASSES

__all__ = ["DroneObjectDetector", "SUPPORTED_CLASSES"]
__version__ = "0.1.0"
