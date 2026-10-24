import math
import cv2
import numpy as np
from typing import Tuple, List, Dict, Any
from backend.app.detector.base import BaseDetector


class MockDetector(BaseDetector):
    """
    Mock detector that simulates real-time object detection (human, car, drone)
    moving across frames. Used for robust testing before YOLOv8 integration.
    """

    def __init__(self):
        self._frame_count = 0
        self.colors = {
            "human": (0, 255, 0),       # Green
            "car": (255, 140, 0),       # Blue/Orange
            "drone": (0, 0, 255),       # Red
            "suspicious": (0, 69, 255), # Red-Orange
        }

    def process_frame(
        self, frame: np.ndarray
    ) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        self._frame_count += 1
        h, w = frame.shape[:2]

        if h < 20 or w < 20:
            return frame, []

        annotated_frame = frame.copy()
        detections: List[Dict[str, Any]] = []

        # Simulate a moving human target
        human_cx = int(w * 0.3 + (w * 0.2) * math.sin(self._frame_count * 0.05))
        human_cy = int(h * 0.5 + (h * 0.15) * math.cos(self._frame_count * 0.05))
        human_w, human_h = int(w * 0.08), int(h * 0.22)
        x1 = max(0, human_cx - human_w // 2)
        y1 = max(0, human_cy - human_h // 2)
        x2 = min(w - 1, human_cx + human_w // 2)
        y2 = min(h - 1, human_cy + human_h // 2)

        detections.append({
            "class": "human",
            "confidence": round(0.88 + 0.08 * math.sin(self._frame_count * 0.1), 2),
            "bbox": [float(x1), float(y1), float(x2), float(y2)],
        })

        # Simulate a moving car target periodically
        if (self._frame_count // 30) % 2 == 0:
            car_cx = int(w * 0.7 - (w * 0.25) * math.cos(self._frame_count * 0.04))
            car_cy = int(h * 0.75)
            car_w, car_h = int(w * 0.18), int(h * 0.12)
            cx1 = max(0, car_cx - car_w // 2)
            cy1 = max(0, car_cy - car_h // 2)
            cx2 = min(w - 1, car_cx + car_w // 2)
            cy2 = min(h - 1, car_cy + car_h // 2)

            detections.append({
                "class": "car",
                "confidence": round(0.92 - 0.05 * math.cos(self._frame_count * 0.08), 2),
                "bbox": [float(cx1), float(cy1), float(cx2), float(cy2)],
            })

        # Render visualizations on the frame
        for det in detections:
            cls_name = det["class"]
            conf = det["confidence"]
            bx1, by1, bx2, by2 = [int(v) for v in det["bbox"]]
            color = self.colors.get(cls_name, (0, 255, 255))

            # Bounding box
            cv2.rectangle(annotated_frame, (bx1, by1), (bx2, by2), color, 2)

            # Label banner
            label = f"{cls_name} {conf:.2f}"
            (lw, lh), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(
                annotated_frame,
                (bx1, max(0, by1 - lh - 8)),
                (bx1 + lw + 4, max(lh + 8, by1)),
                color,
                -1,
            )
            cv2.putText(
                annotated_frame,
                label,
                (bx1 + 2, max(lh + 4, by1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

        # Telemetry overlay (Drone HUD style)
        hud_text = f"DRONE SIMULATOR | FRAME: {self._frame_count} | DETECTIONS: {len(detections)}"
        cv2.putText(
            annotated_frame,
            hud_text,
            (10, 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 255),
            2,
            cv2.LINE_AA,
        )

        return annotated_frame, detections
