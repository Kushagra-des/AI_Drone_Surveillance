# AI Drone Surveillance System

An AI-powered drone surveillance system that detects and tracks objects in real time using Computer Vision and Deep Learning. The project aims to simulate an intelligent surveillance system capable of monitoring live video feeds, identifying suspicious activities, and providing automated alerts.

---
## Project Overview

Traditional surveillance systems require continuous human monitoring, which is inefficient and prone to human error. This project integrates Artificial Intelligence with drone surveillance to automate object detection, tracking, and event monitoring.

The system processes video captured from a drone (or prerecorded drone footage), detects objects such as humans and vehicles, tracks their movement, and displays the processed results in real time.

---

## Objectives

- Detect humans, vehicles, and other objects using AI.
- Perform real-time object tracking.
- Simulate drone-based surveillance.
- Display detection confidence and tracking information.
- Generate alerts for predefined suspicious events.
- Build a modular and scalable surveillance system.

---

## Features

- Real-time object detection
- Object tracking
- Human and vehicle recognition
- Live video processing
- Bounding box visualization
- Confidence score display
- Alert generation
- Easy-to-use interface
- Supports prerecorded videos and webcam
- Extensible for real drone integration
---

## Technologies Used

### Programming Language

- Python 3.x

### Computer Vision

- OpenCV & MediaPipe

### Deep Learning

- YOLOv8
- Ultralytics

### Machine Learning Framework

- PyTorch

### Development Environment

- Visual Studio Code

### Version Control

- Git
- GitHub

---

## Libraries Used

```text
opencv-python
numpy
ultralytics
torch
torchvision
supervision
matplotlib
pandas
```

Install them using:

```bash
pip install -r requirements.txt
```

## Workflow

```
Video Input
      │
      ▼
Frame Extraction
      │
      ▼
YOLO Object Detection
      │
      ▼
Object Tracking
      │
      ▼
Display Results
      │
      ▼
Generate Alerts
```

---

## System Architecture

```
+---------------------+
| Camera / Drone Feed |
+----------+----------+
           |
           v
+---------------------+
| Video Processing    |
+----------+----------+
           |
           v
+---------------------+
| Object Detection    |
| (YOLOv8)            |
+----------+----------+
           |
           v
+---------------------+
| Object Tracking     |
+----------+----------+
           |
           v
+---------------------+
| Alert Generation    |
+----------+----------+
           |
           v
+---------------------+
| User Interface      |
+---------------------+
```

---

## Future Enhancements

- Real drone integration using DJI SDK
- GPS location tracking
- Face recognition
- Weapon detection
- Fire and smoke detection
- Automatic email/SMS alerts
- Cloud storage
- Web dashboard
- Mobile application
- Multi-drone coordination

---

## Applications

- Border surveillance
- Military monitoring
- Smart city surveillance
- Forest monitoring
- Disaster management
- Traffic monitoring
- Industrial inspection
- Campus security
- Event monitoring

---

## Advantages

- Reduces manual monitoring
- Fast object detection
- Real-time surveillance
- High detection accuracy
- Scalable architecture
- Low operational cost
- AI-assisted monitoring

---

## Limitations

- Performance depends on hardware
- Weather conditions may affect video quality
- Requires quality datasets
- High-resolution videos require better GPUs

---

## Team Members

- Himanshu Nagar (241B621) - HimanshuML-Dev
- Abhishek Kumar (241B012) - 
- Kushagra Sharma (241B622) - Kushagra-des

---

## License

This project is intended for educational purposes as part of a minor project in the CSE (AI-ML) curriculum.

---

## Acknowledgements

- Ultralytics YOLO
- OpenCV
- PyTorch
- Python Community
- GitHub

---

## Repository Topics
- ai
- artificial-intelligence
- computer-vision
- deep-learning
- drone
- drone-surveillance
- object-detection
- object-tracking
- yolov8
- opencv
- mediapipe
- python
- pytorch
- machine-learning
- surveillance-system
- real-time-detection

---

## Contact

For any suggestions or contributions, feel free to open an issue or submit a pull request.

---

**Developed as a Minor Project for CSE (AI-ML).**
