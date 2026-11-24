import argparse
import logging
import math
import time
from pathlib import Path

import cv2

from ai_model.alerts import AlertManager
from ai_model.config import DEFAULT_CONFIG, load_config
from ai_model.detector import DroneObjectDetector
from ai_model.zones import ZoneMonitor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("surveillance")


def run(config_path: str | Path = DEFAULT_CONFIG) -> None:
    config = load_config(config_path)
    detector = DroneObjectDetector(
        model_path=str(config["model_path"]),
        conf_threshold=float(config["confidence_threshold"]),
        target_classes=config["classes"],
    )
    source = config["video_source"]
    capture = cv2.VideoCapture(str(source) if isinstance(source, Path) else source)
    if not capture.isOpened():
        raise RuntimeError(f"Could not open video source: {config['video_source']}")

    fps = capture.get(cv2.CAP_PROP_FPS)
    if not math.isfinite(fps) or fps <= 0:
        fps = float(config["video_fps"])
    alerts = None
    try:
        zones = ZoneMonitor(config)
        alerts = AlertManager(config, fps)
        logger.info("Monitoring source %s with %s", config["video_source"], config["model_path"])
        while True:
            ok, frame = capture.read()
            if not ok:
                if isinstance(config["video_source"], int):
                    logger.warning("Camera frame was not available; retrying")
                    time.sleep(0.05)
                    continue
                break

            annotated, detections = detector.process_frame(frame, track=True)
            events = zones.process(detections)
            annotated = zones.draw(annotated)
            for index, event in enumerate(events):
                label = f"ALERT {event['event_type']} {event['object_class']} #{event['track_id']}"
                cv2.putText(annotated, label, (16, 82 + index * 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

            alerts.add_frame(annotated)
            for event in events:
                alerts.handle_alert(event, annotated)
                logger.info("%s: %s #%s", event["event_type"], event["object_class"], event["track_id"])

            cv2.imshow("Drone Surveillance", annotated)
            if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                break
    finally:
        capture.release()
        if alerts:
            alerts.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YOLOv8 drone surveillance")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="Path to config.yaml")
    run(parser.parse_args().config)
