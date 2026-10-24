from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from backend.app.models.alert import AlertRecord
from backend.app.config import settings


class AlertService:
    @staticmethod
    def evaluate_detections(
        db: Session,
        session_id: str,
        source_id: str,
        detections: List[Dict[str, Any]],
        detection_ids: List[int],
    ) -> List[AlertRecord]:
        """
        Evaluate frame detections against alert criteria:
        - Class matches alert classes
        - Confidence >= threshold
        """
        created_alerts: List[AlertRecord] = []
        now = datetime.now(timezone.utc)

        for i, det in enumerate(detections):
            cls_name = det.get("class", "").lower()
            confidence = float(det.get("confidence", 0.0))
            det_id = detection_ids[i] if i < len(detection_ids) else None

            # Check if this object warrants an alert
            if cls_name in settings.ALERT_CLASSES and confidence >= settings.ALERT_CONFIDENCE_THRESHOLD:
                # Severity heuristic
                if cls_name in ("human", "drone"):
                    severity = "critical" if confidence > 0.85 else "warning"
                else:
                    severity = "info"

                message = (
                    f"Alert: High-confidence {cls_name.upper()} ({confidence * 100:.1f}%) "
                    f"detected in surveillance sector."
                )

                alert = AlertRecord(
                    session_id=session_id,
                    source_id=source_id,
                    timestamp=now,
                    alert_type=f"DETECTED_{cls_name.upper()}",
                    severity=severity,
                    message=message,
                    detection_id=det_id,
                )
                db.add(alert)
                created_alerts.append(alert)

        if created_alerts:
            db.commit()
            for alert in created_alerts:
                db.refresh(alert)

        return created_alerts


alert_service = AlertService()
