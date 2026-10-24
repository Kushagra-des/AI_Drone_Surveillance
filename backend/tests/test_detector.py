import unittest
import numpy as np
from backend.app.detector.mock_detector import MockDetector
from backend.app.detector.yolo_adapter import YOLOAdapter


class TestDetectors(unittest.TestCase):
    def setUp(self):
        self.frame = np.zeros((480, 640, 3), dtype=np.uint8)

    def test_mock_detector_interface_and_schema(self):
        detector = MockDetector()
        annotated_frame, detections = detector.process_frame(self.frame)

        self.assertIsInstance(annotated_frame, np.ndarray)
        self.assertEqual(annotated_frame.shape, (480, 640, 3))
        self.assertIsInstance(detections, list)
        self.assertGreater(len(detections), 0)

        for det in detections:
            self.assertIn("class", det)
            self.assertIn("confidence", det)
            self.assertIn("bbox", det)

            self.assertIsInstance(det["class"], str)
            self.assertIsInstance(det["confidence"], float)
            self.assertTrue(0.0 <= det["confidence"] <= 1.0)

            bbox = det["bbox"]
            self.assertEqual(len(bbox), 4)
            x1, y1, x2, y2 = bbox
            self.assertLessEqual(x1, x2)
            self.assertLessEqual(y1, y2)
            self.assertTrue(0 <= x1 <= 640)
            self.assertTrue(0 <= y1 <= 480)
            self.assertTrue(0 <= x2 <= 640)
            self.assertTrue(0 <= y2 <= 480)

    def test_yolo_adapter_fallback_gracefully(self):
        adapter = YOLOAdapter()
        annotated_frame, detections = adapter.process_frame(self.frame)

        self.assertIsInstance(annotated_frame, np.ndarray)
        self.assertIsInstance(detections, list)
        self.assertGreater(len(detections), 0)


if __name__ == "__main__":
    unittest.main()
