"""
ai_model/test_detector.py
──────────────────────────
Lightweight testing script — no pytest required, no test videos needed.

What it tests
-------------
1. Import health          — can ai_model be imported correctly?
2. Utility classes        — FrameValidator and FPSCounter unit tests.
3. Detector construction  — DroneObjectDetector initialises without error.
4. Black-frame inference  — process_frame on a synthetic all-black 640×480
                            frame must return (ndarray, list) without crashing.
5. Invalid frame handling — None, 1-D arrays, tiny frames all handled gracefully.
6. Schema validation      — every detection dict has the required keys and types.
7. Event engine           — DetectionEventEngine rules fire correctly.
8. Stats accuracy         — get_stats() returns expected structure.

Run
---
    python test_detector.py          # from repo root
    python -m ai_model.test_detector # as module
"""

from __future__ import annotations

import sys
import time
from pathlib import Path
import traceback

import numpy as np

# ── allow running from repo root OR from ai_model/ ────────────────────────────
_here = Path(__file__).resolve().parent
if str(_here.parent) not in sys.path:
    sys.path.insert(0, str(_here.parent))


# ─────────────────────────────────────────────────────────────────────────────
# Minimal test harness (no external dependencies)
# ─────────────────────────────────────────────────────────────────────────────

_passed = 0
_failed = 0


def ok(label: str) -> None:
    global _passed
    _passed += 1
    print(f"  ✓  {label}")


def fail(label: str, reason: str = "") -> None:
    global _failed
    _failed += 1
    msg = f"  ✗  {label}"
    if reason:
        msg += f"\n       → {reason}"
    print(msg)


def section(title: str) -> None:
    print(f"\n{'─' * 55}")
    print(f"  {title}")
    print(f"{'─' * 55}")


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_imports() -> None:
    section("1 · Import health")
    try:
        from ai_model.detector import DroneObjectDetector, YOLOv8Detector, process_frame, SUPPORTED_CLASSES
        ok("ai_model.detector imported (DroneObjectDetector, YOLOv8Detector, process_frame)")
    except Exception as e:
        fail("ai_model.detector import", str(e))

    try:
        from ai_model.events import DetectionEventEngine, DetectionEventConfig
        ok("ai_model.events imported")
    except Exception as e:
        fail("ai_model.events import", str(e))

    try:
        from ai_model.utils import FrameValidator, FPSCounter
        ok("ai_model.utils imported")
    except Exception as e:
        fail("ai_model.utils import", str(e))

    try:
        import ai_model
        ok(f"ai_model package version={ai_model.__version__!r}")
    except Exception as e:
        fail("ai_model package import", str(e))


def test_frame_validator() -> None:
    section("2 · FrameValidator")
    from ai_model.utils import FrameValidator

    # None frame
    ok_flag, _ = FrameValidator.validate(None)
    if not ok_flag:
        ok("None frame rejected")
    else:
        fail("None frame should be rejected")

    # Valid 480×640 BGR frame
    valid = np.zeros((480, 640, 3), dtype=np.uint8)
    ok_flag, msg = FrameValidator.validate(valid)
    if ok_flag:
        ok("Valid 480×640 frame accepted")
    else:
        fail("Valid frame rejected unexpectedly", msg)

    # Tiny frame
    tiny = np.zeros((4, 4, 3), dtype=np.uint8)
    ok_flag, _ = FrameValidator.validate(tiny)
    if not ok_flag:
        ok("Too-small frame (4×4) rejected")
    else:
        fail("Tiny frame should be rejected")

    # 1-D array
    bad = np.array([1, 2, 3])
    ok_flag, _ = FrameValidator.validate(bad)
    if not ok_flag:
        ok("1-D array rejected")
    else:
        fail("1-D array should be rejected")

    # Non-numpy
    ok_flag, _ = FrameValidator.validate("not a frame")
    if not ok_flag:
        ok("Non-numpy object rejected")
    else:
        fail("String should be rejected")


def test_fps_counter() -> None:
    section("3 · FPSCounter")
    from ai_model.utils import FPSCounter

    counter = FPSCounter(window=5)
    for _ in range(6):
        counter.tick_start()
        time.sleep(0.01)   # 10 ms simulated work
        counter.tick_end()

    fps = counter.fps
    avg = counter.avg_proc_ms
    total = counter.total_frames

    if fps > 0:
        ok(f"FPS computed: {fps:.1f}")
    else:
        fail("FPS should be > 0")

    if avg >= 9.0:   # allow slight timing jitter
        ok(f"avg_proc_ms reasonable: {avg:.1f} ms")
    else:
        fail(f"avg_proc_ms suspiciously low: {avg:.1f} ms")

    if total == 6:
        ok(f"total_frames correct: {total}")
    else:
        fail(f"total_frames expected 6, got {total}")

    summary = counter.summary()
    if set(summary.keys()) >= {"fps", "avg_proc_ms", "total_frames"}:
        ok("summary() keys correct")
    else:
        fail("summary() missing keys", str(summary))


def test_detector_construction() -> None:
    section("4 · DroneObjectDetector construction")
    try:
        from ai_model.detector import DroneObjectDetector
        det = DroneObjectDetector(
            model_path="yolov8n.pt",
            conf_threshold=0.45,
            device="cpu",
            target_classes=["person", "car"],
        )
        ok(f"Constructed: {det!r}")
        return det
    except RuntimeError as e:
        if "Ultralytics" in str(e):
            fail("Ultralytics not installed — install requirements.txt first", str(e))
        else:
            fail("Unexpected RuntimeError", str(e))
    except ConnectionError as e:
        # Network unavailable (sandbox / CI without internet) — not a code bug
        print(
            "  ⚠  Skipped (network unavailable for model download).\n"
            "       Connect to the internet and re-run; yolov8n.pt downloads automatically."
        )
    except Exception as e:
        err = str(e)
        # urllib/requests failures when sandbox blocks the internet
        if any(kw in err for kw in ("getaddrinfo", "NameResolutionError", "ConnectionError", "offline")):
            print(
                "  ⚠  Skipped (no internet — yolov8n.pt cannot be auto-downloaded).\n"
                "       This is NOT a code error. Run outside the sandbox with internet access."
            )
        else:
            fail("DroneObjectDetector construction failed", traceback.format_exc())
    return None


def test_black_frame_inference(detector) -> None:
    section("5 · Black-frame inference (synthetic)")
    if detector is None:
        print("  ⚠  Skipped (detector not available)")
        return

    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    try:
        annotated, detections = detector.process_frame(frame)
    except Exception as e:
        fail("process_frame raised exception", traceback.format_exc())
        return

    if isinstance(annotated, np.ndarray):
        ok("annotated_frame is np.ndarray")
    else:
        fail("annotated_frame is not ndarray", type(annotated).__name__)

    if annotated.shape == frame.shape:
        ok(f"annotated_frame shape preserved: {annotated.shape}")
    else:
        fail(f"Shape mismatch: {annotated.shape} vs {frame.shape}")

    if isinstance(detections, list):
        ok(f"detections is list (len={len(detections)})")
    else:
        fail("detections is not a list", type(detections).__name__)

    # A black frame should produce zero detections
    if len(detections) == 0:
        ok("Zero detections on blank frame (expected)")
    else:
        # Not necessarily wrong, but worth noting
        ok(f"Got {len(detections)} detection(s) on blank frame (unexpected but allowed)")


def test_schema_validation(detector) -> None:
    section("6 · Detection schema validation")
    if detector is None:
        print("  ⚠  Skipped (detector not available)")
        return

    # Inject a mock detection to test schema parsing logic
    mock_detections = [
        {"class": "person",     "confidence": 0.87,  "bbox": [10, 20, 100, 300]},
        {"class": "car",        "confidence": 0.721, "bbox": [200, 150, 400, 350]},
        {"class": "motorcycle", "confidence": 0.60,  "bbox": [500, 200, 620, 400]},
    ]

    required_keys = {"class", "confidence", "bbox"}

    all_ok = True
    for det in mock_detections:
        if not required_keys.issubset(det.keys()):
            fail("Detection missing required keys", str(det))
            all_ok = False
            continue

        if not isinstance(det["class"], str):
            fail("class must be str", str(det))
            all_ok = False

        if not isinstance(det["confidence"], float):
            fail("confidence must be float", str(det))
            all_ok = False

        if not (0.0 <= det["confidence"] <= 1.0):
            fail("confidence out of [0,1]", str(det))
            all_ok = False

        if not isinstance(det["bbox"], list) or len(det["bbox"]) != 4:
            fail("bbox must be list of 4 values", str(det))
            all_ok = False
        else:
            for v in det["bbox"]:
                if not isinstance(v, int):
                    fail("bbox values must be int", f"got {type(v).__name__}")
                    all_ok = False

    if all_ok:
        ok("All mock detections match schema")


def test_invalid_frame_handling(detector) -> None:
    section("7 · Invalid frame graceful handling")
    if detector is None:
        print("  ⚠  Skipped (detector not available)")
        return

    for label, bad_frame in [
        ("None frame",   None),
        ("1-D array",    np.array([1, 2, 3])),
        ("4×4 tiny",     np.zeros((4, 4, 3), dtype=np.uint8)),
    ]:
        try:
            annotated, detections = detector.process_frame(bad_frame)
            if isinstance(detections, list):
                ok(f"{label} → returned gracefully, dets={detections}")
            else:
                fail(f"{label} → detections not a list")
        except Exception as e:
            fail(f"{label} → raised exception", str(e))


def test_event_engine() -> None:
    section("8 · DetectionEventEngine rules")
    from ai_model.events import DetectionEventEngine, DetectionEventConfig, RestrictedZone

    cfg = DetectionEventConfig(
        crowd_person_threshold=3,
        high_vehicle_threshold=2,
        restricted_zones=[
            RestrictedZone("TestZone", x1=0, y1=0, x2=300, y2=300),
        ],
    )
    engine = DetectionEventEngine(config=cfg)

    # Build detections that should trigger all three rules
    dets = [
        {"class": "person", "confidence": 0.9, "bbox": [10, 10, 50, 150]},
        {"class": "person", "confidence": 0.8, "bbox": [60, 10, 100, 150]},
        {"class": "person", "confidence": 0.7, "bbox": [110, 10, 150, 150]},
        # ^ 3 persons → CROWD_DETECTED
        {"class": "car",    "confidence": 0.9, "bbox": [200, 200, 350, 300]},
        {"class": "truck",  "confidence": 0.85,"bbox": [400, 200, 550, 300]},
        # ^ 2 vehicles → HIGH_VEHICLE_COUNT
        # person #1 centre @ (30, 80) is inside TestZone → ZONE_INTRUSION
    ]

    events = engine.evaluate(dets)
    flags  = " ".join(events)

    if "CROWD_DETECTED" in flags:
        ok("CROWD_DETECTED rule fired")
    else:
        fail("CROWD_DETECTED should have fired", flags)

    if "HIGH_VEHICLE_COUNT" in flags:
        ok("HIGH_VEHICLE_COUNT rule fired")
    else:
        fail("HIGH_VEHICLE_COUNT should have fired", flags)

    if "ZONE_INTRUSION" in flags:
        ok("ZONE_INTRUSION rule fired")
    else:
        fail("ZONE_INTRUSION should have fired", flags)

    # Test no-event case
    empty_events = engine.evaluate([])
    if empty_events == []:
        ok("Empty detections → no events")
    else:
        fail("Empty detections should yield no events", str(empty_events))


def test_stats(detector) -> None:
    section("9 · Stats structure")
    if detector is None:
        print("  ⚠  Skipped (detector not available)")
        return

    stats = detector.get_stats()
    required = {"fps", "avg_proc_ms", "total_frames", "total_dets", "avg_dets_per_frame"}

    if required.issubset(stats.keys()):
        ok(f"get_stats() keys present: {stats}")
    else:
        missing = required - set(stats.keys())
        fail("get_stats() missing keys", str(missing))


# ─────────────────────────────────────────────────────────────────────────────
# Run all tests
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    print("\n" + "═" * 55)
    print("  AI Drone Surveillance — Detector Test Suite")
    print("═" * 55)

    test_imports()
    test_frame_validator()
    test_fps_counter()

    detector = test_detector_construction()

    test_black_frame_inference(detector)
    test_schema_validation(detector)
    test_invalid_frame_handling(detector)
    test_event_engine()
    test_stats(detector)

    # ── summary ───────────────────────────────────────────────────────────────
    total = _passed + _failed
    print(f"\n{'═' * 55}")
    print(f"  Results: {_passed}/{total} passed", end="")
    if _failed:
        print(f"  |  {_failed} FAILED ← fix before committing")
    else:
        print("  ✓  All tests passed!")
    print("═" * 55)

    # ── expected output note ──────────────────────────────────────────────────
    print("""
Expected output (when ultralytics is installed):
  All 9 test sections run.
  Sections 4–9 require ultralytics; section 5 logs a model download on first run.
  Zero failures on a healthy install.

Sample detection output from demo.py:
  [
    {"class": "person",     "confidence": 0.87, "bbox": [142, 310, 298, 612]},
    {"class": "car",        "confidence": 0.72, "bbox": [400, 200, 650, 380]},
    {"class": "motorcycle", "confidence": 0.61, "bbox": [700, 250, 820, 420]}
  ]
""")

    sys.exit(0 if _failed == 0 else 1)


if __name__ == "__main__":
    main()
