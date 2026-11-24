from typing import List, Optional
import logging
import sqlite3
from contextlib import closing
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.alert import AlertRecord
from backend.app.models.detection import DetectionRecord

router = APIRouter(tags=["Events"])
logger = logging.getLogger(__name__)


@router.get("/events")
def get_events(
    limit: int = Query(100, ge=1, le=500),
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
) -> List[dict]:
    query = db.query(DetectionRecord)
    if session_id:
        query = query.filter(DetectionRecord.session_id == session_id)
    detections = (
        query
        .order_by(DetectionRecord.timestamp.desc(), DetectionRecord.id.desc())
        .limit(limit)
        .all()
    )
    detection_ids = [detection.id for detection in detections]
    alert_detection_ids = set()
    if detection_ids:
        alert_detection_ids = {
            detection_id
            for (detection_id,) in db.query(AlertRecord.detection_id)
            .filter(AlertRecord.detection_id.in_(detection_ids))
            .all()
        }

    combined = []
    for detection in detections:
        event_time = detection.timestamp
        if event_time.tzinfo is None:
            event_time = event_time.replace(tzinfo=timezone.utc)
        combined.append((event_time.timestamp(), {
            "time": detection.timestamp.strftime("%H:%M:%S"),
            "type": detection.class_name,
            "id": detection.id,
            "confidence": detection.confidence,
            "alert": detection.id in alert_detection_ids,
        }))
    if not session_id:
        try:
            from ai_model.config import load_config

            db_path = load_config()["events_db"]
            if db_path.exists():
                with closing(sqlite3.connect(str(db_path), timeout=0.2)) as event_db:
                    rows = event_db.execute(
                        "SELECT timestamp, event_type, object_class, track_id, confidence "
                        "FROM events ORDER BY timestamp DESC LIMIT ?",
                        (limit,),
                    ).fetchall()
                for timestamp, event_type, object_class, track_id, confidence in rows:
                    event_time = datetime.fromisoformat(timestamp)
                    if event_time.tzinfo is None:
                        event_time = event_time.replace(tzinfo=timezone.utc)
                    combined.append((
                        event_time.timestamp(), {
                            "time": event_time.strftime("%H:%M:%S"),
                            "type": object_class,
                            "id": track_id,
                            "confidence": confidence,
                            "alert": True,
                            "event_type": event_type,
                        }
                    ))
        except Exception:
            logger.exception("Could not read zone alerts from events.db")

    combined.sort(key=lambda item: item[0], reverse=True)
    return [event for _, event in combined[:limit]]
