import time
import unittest
from pathlib import Path
import cv2
import numpy as np
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.video_storage import video_storage
from backend.app.services.pipeline import pipeline


class TestMonitorRouter(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

        # Ensure pipeline is clean
        if pipeline.is_active:
            try:
                pipeline.stop_session()
            except Exception:
                pass

        # Create a sample video directly in uploads
        self.sample_filename = "mock_monitor_sample.mp4"
        self.sample_path = video_storage.get_upload_dir() / self.sample_filename

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(self.sample_path), fourcc, 15.0, (320, 240))
        for _ in range(15):
            frame = np.zeros((240, 320, 3), dtype=np.uint8)
            writer.write(frame)
        writer.release()

    def tearDown(self):
        if pipeline.is_active:
            try:
                pipeline.stop_session()
            except Exception:
                pass
        if self.sample_path.exists():
            self.sample_path.unlink()

    def test_start_unauthorized_webcam(self):
        response = self.client.post(
            "/api/monitor/start",
            json={"source_type": "webcam", "source": "99"},
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("not in allowed camera sources", response.json()["detail"])

    def test_start_nonexistent_video(self):
        response = self.client.post(
            "/api/monitor/start",
            json={"source_type": "video_file", "source": "does_not_exist.mp4"},
        )
        self.assertEqual(response.status_code, 404)

    def test_start_stop_monitoring_lifecycle_and_conflict(self):
        # 1. Start valid session
        response = self.client.post(
            "/api/monitor/start",
            json={"source_type": "video_file", "source": self.sample_filename},
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("session_id", data)
        self.assertEqual(data["status"], "active")
        self.assertEqual(data["source_id"], self.sample_filename)

        # Let the pipeline process a few frames
        time.sleep(0.3)

        # 2. Prevent duplicate monitoring sessions (409 Conflict)
        conflict_response = self.client.post(
            "/api/monitor/start",
            json={"source_type": "video_file", "source": self.sample_filename},
        )
        self.assertEqual(conflict_response.status_code, 409)

        # 3. Stop monitoring
        stop_response = self.client.post("/api/monitor/stop")
        self.assertEqual(stop_response.status_code, 200)
        stop_data = stop_response.json()
        self.assertEqual(stop_data["status"], "stopped")
        self.assertGreaterEqual(stop_data["total_frames"], 1)

        # 4. Stop again when not active -> 400
        stop_again = self.client.post("/api/monitor/stop")
        self.assertEqual(stop_again.status_code, 400)


if __name__ == "__main__":
    unittest.main()
