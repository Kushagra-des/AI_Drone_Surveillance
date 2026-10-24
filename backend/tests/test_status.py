import unittest
from fastapi.testclient import TestClient
from backend.app.main import app


class TestStatusRouter(unittest.TestCase):
    def test_get_status_endpoint(self):
        with TestClient(app) as client:
            response = client.get("/api/status")
            self.assertEqual(response.status_code, 200)

            data = response.json()
            self.assertEqual(data["status"], "operational")
            self.assertIn("uptime_seconds", data)
            self.assertIn("detector_type", data)
            self.assertIn("connected_ws_clients", data)
            self.assertIn("fps", data)
            self.assertTrue(data["uptime_seconds"] >= 0)


if __name__ == "__main__":
    unittest.main()
