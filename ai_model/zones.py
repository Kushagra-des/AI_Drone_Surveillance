import time

import cv2
import numpy as np
import supervision as sv


class ZoneMonitor:
    def __init__(self, config: dict):
        self.classes = config["classes"]
        self.class_ids = {name: index for index, name in enumerate(self.classes)}
        self.polygon = np.asarray(config["zone_points"], dtype=np.int32)
        self.reference_size = config.get("reference_frame_size", [640, 480])
        self.zone = sv.PolygonZone(
            polygon=self.polygon,
            triggering_anchors=(sv.Position.BOTTOM_CENTER,),
        )
        start, end = config["line_points"]
        self.line_points = (start, end)
        self.lines = {
            name: sv.LineZone(
                start=sv.Point(x=int(start[0]), y=int(start[1])),
                end=sv.Point(x=int(end[0]), y=int(end[1])),
                triggering_anchors=(sv.Position.BOTTOM_CENTER,),
            )
            for name in self.classes
        }
        self.loitering_seconds = float(config["loitering_seconds"])
        self.inside_since = {}
        self.zone_alerted = set()
        self.loiter_alerted = set()
        self.last_seen_inside = {}
        self.frame_size = None

    def _fit_to_frame(self, width: int, height: int) -> None:
        if self.frame_size == (width, height):
            return
        ref_width, ref_height = self.reference_size
        sx, sy = width / ref_width, height / ref_height
        self.frame_polygon = np.rint(self.polygon * [sx, sy]).astype(np.int32)
        self.zone = sv.PolygonZone(
            polygon=self.frame_polygon,
            triggering_anchors=(sv.Position.BOTTOM_CENTER,),
        )
        start, end = self.line_points
        self.frame_line_points = (
            (round(start[0] * sx), round(start[1] * sy)),
            (round(end[0] * sx), round(end[1] * sy)),
        )
        self.lines = {
            name: sv.LineZone(
                start=sv.Point(x=self.frame_line_points[0][0], y=self.frame_line_points[0][1]),
                end=sv.Point(x=self.frame_line_points[1][0], y=self.frame_line_points[1][1]),
                triggering_anchors=(sv.Position.BOTTOM_CENTER,),
            )
            for name in self.classes
        }
        self.frame_size = (width, height)

    def process(
        self,
        detections: list[dict],
        *,
        frame_size: tuple[int, int] = (480, 640),
        zone_alerts_enabled: bool = True,
        loitering_enabled: bool = True,
    ) -> list[dict]:
        self._fit_to_frame(frame_size[1], frame_size[0])
        tracked = [
            item for item in detections
            if item["class"] in self.class_ids
            and item.get("track_id") is not None
            and int(item["track_id"]) >= 0
        ]
        height, width = frame_size
        xyxy = np.asarray([item["bbox"] for item in tracked], dtype=np.float32).reshape(-1, 4)
        if len(xyxy):
            xyxy[:, [0, 2]] = np.clip(xyxy[:, [0, 2]], 0, width - 1)
            xyxy[:, [1, 3]] = np.clip(xyxy[:, [1, 3]], 0, height - 1)
        supervision_detections = sv.Detections(
            xyxy=xyxy,
            confidence=np.asarray([item["confidence"] for item in tracked], dtype=np.float32),
            class_id=np.asarray([self.class_ids[item["class"]] for item in tracked], dtype=int),
            tracker_id=np.asarray([item["track_id"] for item in tracked], dtype=int),
        )

        for name, line in self.lines.items():
            line.trigger(supervision_detections[supervision_detections.class_id == self.class_ids[name]])

        now = time.monotonic()
        inside = self.zone.trigger(supervision_detections)
        seen = set()
        alerts = []
        for index, detection in enumerate(tracked):
            track_id = int(detection["track_id"])
            seen.add(track_id)
            if not inside[index]:
                self.inside_since.pop(track_id, None)
                self.last_seen_inside.pop(track_id, None)
        for index, is_inside in enumerate(inside):
            if not is_inside:
                continue
            detection = tracked[index]
            track_id = int(detection["track_id"])
            object_class = detection["class"]
            self.last_seen_inside[track_id] = now

            if zone_alerts_enabled and track_id not in self.zone_alerted:
                alerts.append(self._event("zone", detection))
                self.zone_alerted.add(track_id)
            if object_class == "person":
                self.inside_since.setdefault(track_id, now)
                if loitering_enabled and now - self.inside_since[track_id] >= self.loitering_seconds and track_id not in self.loiter_alerted:
                    alerts.append(self._event("loitering", detection))
                    self.loiter_alerted.add(track_id)

        for track_id in list(self.inside_since):
            if track_id not in seen and now - self.last_seen_inside.get(track_id, now) > 2.0:
                del self.inside_since[track_id]
                self.last_seen_inside.pop(track_id, None)
        return alerts

    @staticmethod
    def _event(event_type: str, detection: dict) -> dict:
        return {
            "event_type": event_type,
            "object_class": detection["class"],
            "track_id": int(detection["track_id"]),
            "confidence": float(detection["confidence"]),
        }

    def draw(self, frame: np.ndarray) -> np.ndarray:
        self._fit_to_frame(frame.shape[1], frame.shape[0])
        cv2.polylines(frame, [self.frame_polygon.reshape(-1, 1, 2)], True, (40, 180, 40), 2)
        cv2.putText(frame, "Restricted zone", tuple(map(int, self.frame_polygon[0])), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (40, 180, 40), 2)
        start, end = self.frame_line_points
        cv2.arrowedLine(frame, tuple(map(int, start)), tuple(map(int, end)), (0, 180, 255), 2)
        in_counts = "  ".join(f"{name}: {line.in_count}" for name, line in self.lines.items())
        out_counts = "  ".join(f"{name}: {line.out_count}" for name, line in self.lines.items())
        cv2.putText(frame, f"IN  {in_counts}", (16, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
        cv2.putText(frame, f"OUT {out_counts}", (16, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
        for index, (track_id, started) in enumerate(self.inside_since.items()):
            elapsed = time.monotonic() - started
            cv2.putText(
                frame,
                f"Person #{track_id} in zone: {elapsed:.0f}/{self.loitering_seconds:.0f}s",
                (16, 78 + index * 22),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1,
            )
        return frame
