import unittest
from fastapi.testclient import TestClient
from backend.app.main import app


class TestVideoFeed(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_mjpeg_feed_header(self):
        # We make a streaming request using client.stream
        with self.client.stream("GET", "/api/video-feed") as response:
            self.assertEqual(response.status_code, 200)
            self.assertIn("multipart/x-mixed-replace", response.headers.get("content-type", ""))
            # Read first chunk
            for chunk in response.iter_raw():
                self.assertIn(b"--frame", chunk)
                break


if __name__ == "__main__":
    unittest.main()
