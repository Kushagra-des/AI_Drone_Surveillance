import unittest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.connection_manager import manager


class TestWebSocketStream(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_websocket_connect_and_heartbeat(self):
        with self.client.websocket_connect("/ws/detections") as websocket:
            # First message is connection handshake
            init_msg = websocket.receive_json()
            self.assertEqual(init_msg["event"], "connected")

            # Test ping/pong
            websocket.send_text("ping")
            pong = websocket.receive_text()
            self.assertEqual(pong, "pong")


if __name__ == "__main__":
    unittest.main()
