"""
ai_model/events.py
──────────────────
Detection-triggered event engine for the AI Drone Surveillance system.

IMPORTANT — Scope & Honest Capability Statement
------------------------------------------------
This module implements simple **heuristic counting rules** applied to
the detection output from DroneObjectDetector.  It does NOT provide:

  ✗ Behavioral risk assessment (no trajectory analysis)
  ✗ Face recognition or identity tracking
  ✗ Suspicious activity recognition
  ✗ Multi-frame object tracking
  ✗ Machine-learning-based anomaly detection

What it DOES provide:
  ✓ Frame-level crowd-density alerts (too many persons detected)
  ✓ High vehicle count alerts
  ✓ Restricted-zone proximity alerts (configurable rectangular zones)
  ✓ A clean event list that the backend can forward to the frontend

Future enhancement: replace heuristic rules with proper multi-frame
tracking (e.g., ByteTrack, BoT-SORT) to enable real trajectory analysis.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Tuple


# ─────────────────────────────────────────────────────────────────────────────
# Zone definition
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class RestrictedZone:
    """
    An axis-aligned rectangular region of interest.

    Coordinates are in pixel space and must match the resolution of the
    frames being processed.  All values are integers.

    Attributes
    ----------
    name : str
        Human-readable zone name shown in event flags.
    x1, y1, x2, y2 : int
        Top-left and bottom-right pixel coordinates (xyxy).
    """
    name: str
    x1: int
    y1: int
    x2: int
    y2: int

    def contains_bbox_centre(self, bbox: list[int] | list[float]) -> bool:
        """Return True if the bbox centre point falls inside this zone."""
        if not bbox or len(bbox) < 4:
            return False
        bx1, by1, bx2, by2 = bbox[:4]
        cx = (bx1 + bx2) / 2.0
        cy = (by1 + by2) / 2.0
        return self.x1 <= cx <= self.x2 and self.y1 <= cy <= self.y2


# ─────────────────────────────────────────────────────────────────────────────
# Event engine
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class DetectionEventConfig:
    """Thresholds and zones for the event engine."""
    crowd_person_threshold: int = 5
    """Trigger 'CROWD_DETECTED' when ≥ this many persons appear in one frame."""

    high_vehicle_threshold: int = 4
    """Trigger 'HIGH_VEHICLE_COUNT' when ≥ this many vehicles in one frame."""

    vehicle_classes: list[str] = field(
        default_factory=lambda: ["car", "motorcycle", "bus", "truck"]
    )

    restricted_zones: list[RestrictedZone] = field(default_factory=list)
    """
    Optional list of RestrictedZone instances.  Any detection whose centre
    falls inside a zone fires a 'ZONE_INTRUSION:<zone_name>' event.
    """


class DetectionEventEngine:
    """
    Applies heuristic rules to per-frame detections and returns
    a list of plain-text event flags for the current frame.

    This class is intentionally stateless between frames (no tracking
    history) so it is safe to call from concurrent threads/workers.

    Parameters
    ----------
    config : DetectionEventConfig | None
        Rule configuration.  Pass ``None`` to use sensible defaults.

    Usage
    -----
        engine = DetectionEventEngine()
        events = engine.evaluate(detections)
        # events → ["CROWD_DETECTED (6 persons)", "ZONE_INTRUSION:Gate-A"]
    """

    def __init__(self, config: DetectionEventConfig | None = None) -> None:
        self.config = config or DetectionEventConfig()

    def evaluate(self, detections: List[dict]) -> List[str]:
        """
        Evaluate rule-based event flags for a single frame's detections.

        Parameters
        ----------
        detections : list[dict]
            Output of ``DroneObjectDetector.process_frame()`` — the list of
            detection dicts with keys ``class``, ``confidence``, ``bbox``.

        Returns
        -------
        list[str]
            Zero or more event flag strings.  An empty list means no rules
            were triggered.  Each string is a short human-readable label.

        Notes
        -----
        These are **heuristic rules**, NOT behavioral AI predictions.
        They fire when simple count/proximity thresholds are exceeded in a
        single frame and carry no cross-frame context.
        """
        events: List[str] = []

        persons  = [d for d in detections if d.get("class") == "person"]
        vehicles = [d for d in detections if d.get("class") in self.config.vehicle_classes]

        # Rule 1 — crowd density
        if len(persons) >= self.config.crowd_person_threshold:
            events.append(f"CROWD_DETECTED ({len(persons)} persons)")

        # Rule 2 — high vehicle count
        if len(vehicles) >= self.config.high_vehicle_threshold:
            events.append(f"HIGH_VEHICLE_COUNT ({len(vehicles)} vehicles)")

        # Rule 3 — restricted zone intrusion (all classes)
        for zone in self.config.restricted_zones:
            for det in detections:
                bbox = det.get("bbox")
                if bbox and zone.contains_bbox_centre(bbox):
                    cls_name = det.get("class", "object")
                    conf = det.get("confidence", 0.0)
                    events.append(
                        f"ZONE_INTRUSION:{zone.name} "
                        f"({cls_name} @ conf={conf:.0%})"
                    )
                    break   # one alert per zone per frame is enough

        return events

    # ── convenience factory ───────────────────────────────────────────────────

    @classmethod
    def with_zones(
        cls,
        zones: List[Tuple[str, int, int, int, int]],
        **config_kwargs,
    ) -> "DetectionEventEngine":
        """
        Convenience constructor for building an engine with restricted zones.

        Parameters
        ----------
        zones : list of (name, x1, y1, x2, y2) tuples
        **config_kwargs : forwarded to DetectionEventConfig

        Example
        -------
            engine = DetectionEventEngine.with_zones([
                ("Perimeter", 0, 0, 200, 720),
                ("Gate-A",  500, 300, 700, 500),
            ])
        """
        zone_objects = [
            RestrictedZone(name=n, x1=x1, y1=y1, x2=x2, y2=y2)
            for n, x1, y1, x2, y2 in zones
        ]
        cfg = DetectionEventConfig(
            restricted_zones=zone_objects,
            **config_kwargs,
        )
        return cls(config=cfg)
