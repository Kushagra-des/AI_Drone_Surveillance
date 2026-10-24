"""
ai_model/demo.py
─────────────────
Standalone demonstration script for DroneObjectDetector.

Run on Windows
--------------
  # Webcam (default device 0)
  python demo.py

  # Webcam with custom confidence threshold
  python demo.py --conf 0.35

  # Pre-recorded video file
  python demo.py --source path\\to\\video.mp4

  # Custom model + save annotated output
  python demo.py --source path\\to\\video.mp4 --model yolov8s.pt --save

  # Headless / no display window (API / server mode)
  python demo.py --source path\\to\\video.mp4 --no-display

  # Help
  python demo.py --help

Keyboard shortcuts (when display window is open)
-------------------------------------------------
  q  or  ESC  — quit
  s           — screenshot (saves current frame to output/)
  p           — pause / resume
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from pathlib import Path

import cv2

# Allow running as a script from the repo root or from ai_model/
_here = Path(__file__).resolve().parent
if str(_here.parent) not in sys.path:
    sys.path.insert(0, str(_here.parent))

from ai_model.detector import DroneObjectDetector, SUPPORTED_CLASSES
from ai_model.events   import DetectionEventEngine
from ai_model.utils    import overlay_stats

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("demo")


# ─────────────────────────────────────────────────────────────────────────────
# CLI argument parser
# ─────────────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="AI Drone Surveillance — Object Detection Demo",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument(
        "--source", "-s",
        default="0",
        help=(
            "Video source: '0' (or any integer) for webcam index, "
            "or a path to an MP4/AVI/MOV file."
        ),
    )
    p.add_argument(
        "--model", "-m",
        default="yolov8n.pt",
        help="Model weights: Ultralytics shorthand ('yolov8n.pt') or local .pt path.",
    )
    p.add_argument(
        "--conf", "-c",
        type=float,
        default=0.45,
        help="Detection confidence threshold (0.0–1.0).",
    )
    p.add_argument(
        "--iou",
        type=float,
        default=0.45,
        help="NMS IoU threshold (0.0–1.0).",
    )
    p.add_argument(
        "--device", "-d",
        default="auto",
        help="Inference device: auto | cpu | cuda | cuda:0 | mps.",
    )
    p.add_argument(
        "--classes",
        nargs="+",
        default=SUPPORTED_CLASSES,
        metavar="CLASS",
        help=f"Target class names (space-separated). Available: {SUPPORTED_CLASSES}",
    )
    p.add_argument(
        "--save",
        action="store_true",
        help="Save annotated output to output/<source_name>_detected.mp4",
    )
    p.add_argument(
        "--no-display",
        action="store_true",
        help="Suppress the OpenCV window (headless / server mode).",
    )
    p.add_argument(
        "--max-frames",
        type=int,
        default=0,
        help="Stop after this many frames (0 = run until end/quit).",
    )
    return p


# ─────────────────────────────────────────────────────────────────────────────
# Video source helpers
# ─────────────────────────────────────────────────────────────────────────────

def open_source(source: str) -> tuple[cv2.VideoCapture, str]:
    """
    Open a video capture from a webcam index or file path.

    Returns
    -------
    (cap, source_type)  where source_type is 'webcam' or 'file'.

    Raises
    ------
    SystemExit if the source cannot be opened.
    """
    # Treat pure-integer strings as webcam indices
    try:
        idx = int(source)
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)   # CAP_DSHOW improves Windows latency
        src_type = "webcam"
    except ValueError:
        path = Path(source)
        if not path.exists():
            logger.error("Video file not found: %s", path)
            sys.exit(1)
        cap = cv2.VideoCapture(str(path))
        src_type = "file"

    if not cap.isOpened():
        logger.error(
            "Could not open video source: %s\n"
            "  - For webcam: make sure the camera is connected and not in use.\n"
            "  - For files: confirm the path and codec support.",
            source,
        )
        sys.exit(1)

    return cap, src_type


def get_video_writer(
    cap: cv2.VideoCapture,
    output_path: Path,
) -> cv2.VideoWriter:
    """Create an MP4 VideoWriter matching the capture resolution and FPS."""
    w   = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h   = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    return cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))


# ─────────────────────────────────────────────────────────────────────────────
# Main demo loop
# ─────────────────────────────────────────────────────────────────────────────

def run_demo(args: argparse.Namespace) -> None:
    """Entry point for the demo loop."""

    # ── initialise detector ───────────────────────────────────────────────────
    logger.info("Initialising DroneObjectDetector …")
    try:
        detector = DroneObjectDetector(
            model_path=args.model,
            conf_threshold=args.conf,
            iou_threshold=args.iou,
            device=args.device,
            target_classes=args.classes,
        )
    except (RuntimeError, FileNotFoundError) as exc:
        logger.error("Failed to create detector: %s", exc)
        sys.exit(1)

    logger.info("Detector: %r", detector)

    # ── event engine (optional, heuristic rules only) ─────────────────────────
    event_engine = DetectionEventEngine()

    # ── open video source ─────────────────────────────────────────────────────
    cap, src_type = open_source(args.source)
    logger.info("Opened %s source: %s", src_type, args.source)

    # ── optional output writer ────────────────────────────────────────────────
    writer: cv2.VideoWriter | None = None
    if args.save:
        out_dir = Path("output")
        out_dir.mkdir(exist_ok=True)
        stem = Path(args.source).stem if src_type == "file" else "webcam"
        out_path = out_dir / f"{stem}_detected.mp4"
        writer = get_video_writer(cap, out_path)
        logger.info("Saving output to: %s", out_path)

    # ── display window ────────────────────────────────────────────────────────
    win_name = "AI Drone Surveillance — press Q to quit"
    if not args.no_display:
        cv2.namedWindow(win_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(win_name, 1280, 720)

    # ── main loop ─────────────────────────────────────────────────────────────
    frame_idx    = 0
    paused       = False
    session_start = time.perf_counter()

    logger.info("Starting detection loop … (press Q or ESC to quit)")

    try:
        while True:
            # Pause handling
            if paused:
                key = cv2.waitKey(30) & 0xFF
                if key in (ord("p"), ord("P")):
                    paused = False
                    logger.info("Resumed.")
                elif key in (ord("q"), ord("Q"), 27):
                    break
                continue

            ret, frame = cap.read()
            if not ret:
                if src_type == "file":
                    logger.info("End of video file.")
                else:
                    logger.warning("Camera read failed — retrying …")
                    time.sleep(0.05)
                    continue
                break

            # ── run detection ─────────────────────────────────────────────────
            annotated, detections = detector.process_frame(frame, draw=True)

            # ── evaluate events ───────────────────────────────────────────────
            events = event_engine.evaluate(detections)
            if events:
                # Re-overlay with event flags
                stats = detector.get_stats()
                annotated = overlay_stats(
                    annotated,
                    fps=stats["fps"],
                    proc_ms=stats["avg_proc_ms"],
                    detection_count=len(detections),
                    event_flags=events,
                )
                for ev in events:
                    logger.info("EVENT: %s", ev)

            # ── save frame ────────────────────────────────────────────────────
            if writer is not None:
                writer.write(annotated)

            # ── display ───────────────────────────────────────────────────────
            if not args.no_display:
                cv2.imshow(win_name, annotated)
                key = cv2.waitKey(1) & 0xFF

                if key in (ord("q"), ord("Q"), 27):
                    logger.info("Quit requested.")
                    break
                if key in (ord("p"), ord("P")):
                    paused = True
                    logger.info("Paused. Press P to resume.")
                if key in (ord("s"), ord("S")):
                    ss_path = Path("output") / f"screenshot_{frame_idx:05d}.jpg"
                    ss_path.parent.mkdir(exist_ok=True)
                    cv2.imwrite(str(ss_path), annotated)
                    logger.info("Screenshot saved: %s", ss_path)

            frame_idx += 1
            if args.max_frames > 0 and frame_idx >= args.max_frames:
                logger.info("Reached max-frames limit (%d).", args.max_frames)
                break

    except KeyboardInterrupt:
        logger.info("Interrupted by user.")

    finally:
        cap.release()
        if writer is not None:
            writer.release()
        if not args.no_display:
            cv2.destroyAllWindows()

    # ── final stats ───────────────────────────────────────────────────────────
    elapsed = time.perf_counter() - session_start
    stats   = detector.get_stats()

    print("\n" + "=" * 55)
    print("  DETECTION SESSION SUMMARY")
    print("=" * 55)
    print(f"  Source          : {args.source}")
    print(f"  Model           : {args.model}")
    print(f"  Device          : {detector.device}")
    print(f"  Target classes  : {args.classes}")
    print(f"  Conf threshold  : {args.conf}")
    print(f"  Total frames    : {stats['total_frames']}")
    print(f"  Total detections: {stats['total_dets']}")
    print(f"  Avg dets/frame  : {stats['avg_dets_per_frame']}")
    print(f"  Avg FPS         : {stats['fps']}")
    print(f"  Avg proc time   : {stats['avg_proc_ms']} ms/frame")
    print(f"  Wall time       : {elapsed:.1f} s")
    print("=" * 55)


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = build_parser()
    args   = parser.parse_args()
    run_demo(args)


if __name__ == "__main__":
    main()
