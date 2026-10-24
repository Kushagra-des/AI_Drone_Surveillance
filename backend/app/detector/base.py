from abc import ABC, abstractmethod
from typing import Tuple, List, Dict, Any
import numpy as np


class BaseDetector(ABC):
    """
    Abstract interface for object detectors.
    Must adhere to the shared contract:
    process_frame(frame) -> (annotated_frame, detections)
    where detections is a list of dicts:
    {"class": str, "confidence": float, "bbox": [x1, y1, x2, y2]}
    """

    @abstractmethod
    def process_frame(
        self, frame: np.ndarray
    ) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """
        Process a single video frame.

        Args:
            frame: Raw BGR image as a numpy array.

        Returns:
            Tuple of:
            - annotated_frame: Frame with visualized bounding boxes and labels.
            - detections: List of detection dictionaries in the shared schema:
              [{"class": str, "confidence": float, "bbox": [x1, y1, x2, y2]}]
        """
        pass
