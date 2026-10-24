import os
import io
import unittest
import tempfile
from pathlib import Path
import cv2
import numpy as np
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.config import settings


class TestVideoUploadAndStorage(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Create a tiny valid mp4 video in a temp location
        self.temp_dir = tempfile.TemporaryDirectory()
        self.sample_video_path = Path(self.temp_dir.name) / "test_drone.mp4"

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(self.sample_video_path), fourcc, 10.0, (320, 240))
        for _ in range(10):
            frame = np.zeros((240, 320, 3), dtype=np.uint8)
            writer.write(frame)
        writer.release()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_upload_invalid_extension(self):
        fake_content = b"Not a video"
        files = {"file": ("malicious.exe", io.BytesIO(fake_content), "application/octet-stream")}
        response = self.client.post("/api/videos/upload", files=files)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported video format", response.json()["detail"])

    def test_upload_valid_video(self):
        with open(self.sample_video_path, "rb") as f:
            files = {"file": ("patrol_clip.mp4", f, "video/mp4")}
            response = self.client.post("/api/videos/upload", files=files)

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("filename", data)
        self.assertIn("patrol_clip.mp4", data["filename"])
        self.assertGreater(data["file_size_mb"], 0)

        # Check list endpoint
        list_response = self.client.get("/api/videos")
        self.assertEqual(list_response.status_code, 200)
        video_list = list_response.json()
        self.assertIn(data["filename"], video_list)


if __name__ == "__main__":
    unittest.main()
