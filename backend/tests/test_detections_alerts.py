from datetime import datetime, timezone
import unittest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.session import MonitoringSession
from backend.app.models.detection import DetectionRecord
from backend.app.models.alert import AlertRecord


class TestDetectionsAndAlerts(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

        self.session_id = "test_det_session_001"
        test_session = MonitoringSession(
            session_id=self.session_id,
            source_type="video_file",
            source_id="test.mp4",
            started_at=datetime.now(timezone.utc),
            status="stopped",
            total_frames=10,
            total_detections=2,
        )
        self.db.add(test_session)

        # Seed detection records
        self.d1 = DetectionRecord(
            session_id=self.session_id,
            timestamp=datetime.now(timezone.utc),
            class_name="human",
            confidence=0.92,
            bbox_x1=50.0,
            bbox_y1=60.0,
            bbox_x2=150.0,
            bbox_y2=200.0,
            source_id="test.mp4",
        )
        self.d2 = DetectionRecord(
            session_id=self.session_id,
            timestamp=datetime.now(timezone.utc),
            class_name="car",
            confidence=0.45,
            bbox_x1=200.0,
            bbox_y1=100.0,
            bbox_x2=350.0,
            bbox_y2=220.0,
            source_id="test.mp4",
        )
        self.db.add_all([self.d1, self.d2])

        # Seed alert record
        self.alert = AlertRecord(
            session_id=self.session_id,
            timestamp=datetime.now(timezone.utc),
            alert_type="DETECTED_HUMAN",
            severity="critical",
            message="Alert: High-confidence HUMAN detected.",
            source_id="test.mp4",
        )
        self.db.add(self.alert)
        self.db.commit()

    def tearDown(self):
        self.db.query(AlertRecord).filter(AlertRecord.session_id == self.session_id).delete()
        self.db.query(DetectionRecord).filter(DetectionRecord.session_id == self.session_id).delete()
        self.db.query(MonitoringSession).filter(MonitoringSession.session_id == self.session_id).delete()
        self.db.commit()
        self.db.close()

    def test_get_detections_with_schema_verification(self):
        response = self.client.get(f"/api/detections?session_id={self.session_id}")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIn("total", data)
        self.assertIn("items", data)
        self.assertGreaterEqual(data["total"], 2)

        first = data["items"][0]
        self.assertIn("class", first)
        self.assertIn("confidence", first)
        self.assertIn("bbox", first)
        self.assertIn("timestamp", first)
        self.assertIn("source_id", first)
        self.assertEqual(len(first["bbox"]), 4)

    def test_filter_detections_by_class_and_confidence(self):
        response = self.client.get(f"/api/detections?session_id={self.session_id}&class=human&min_confidence=0.8")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["class"], "human")
        self.assertGreaterEqual(data["items"][0]["confidence"], 0.8)

    def test_get_alerts_with_severity_filter(self):
        response = self.client.get(f"/api/alerts?session_id={self.session_id}&severity=critical")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(len(data["items"]), 1)
        alert_item = data["items"][0]
        self.assertEqual(alert_item["alert_type"], "DETECTED_HUMAN")
        self.assertEqual(alert_item["severity"], "critical")


if __name__ == "__main__":
    unittest.main()
