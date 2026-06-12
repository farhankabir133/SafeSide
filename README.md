# 🦺 SafeSide – Real-Time PPE Detection & Safety Alert System

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![YOLOv8](https://img.shields.io/badge/Model-YOLOv8-green.svg)
![OpenCV](https://img.shields.io/badge/Computer_Vision-OpenCV-orange.svg)
![PyTorch](https://img.shields.io/badge/Framework-PyTorch-red.svg)
![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)

> **SafeSide is an AI-powered real-time construction site safety monitoring system that detects PPE compliance (helmets & safety vests) using YOLOv8 and triggers instant alerts for violations.**

---

## 📌 Overview

Construction sites are high-risk environments where safety compliance is critical.  
SafeSide leverages computer vision and deep learning to automatically detect whether workers are wearing required PPE and instantly notify supervisors when violations occur.

The system runs on live webcam or video feeds and identifies:

- 🪖 Helmet
- ❌ No Helmet
- 🦺 Safety Vest
- ❌ No Safety Vest

When unsafe conditions are detected, an instant alert system (Discord Webhooks) is triggered.

---

## 🚀 Key Features

### 🔍 Real-Time Object Detection
- Powered by YOLOv8 nano (YOLOv8n)
- Optimized for low-latency inference on live video feeds

### 🧠 Custom Trained Model
- Trained on a manually curated PPE dataset
- Annotated using YOLO format labels

### 📹 Live Monitoring System
- Webcam-based real-time detection
- Video file analysis support

### 🚨 Instant Alert System
- Discord Webhook integration
- Cooldown system to prevent spam alerts

### 📊 Model Evaluation
- Confusion matrix analysis
- Precision-recall curves
- F1 score evaluation

SafeSide
│
├── Data_CV/
│ ├── train/
│ ├── test/
│ ├── data.yaml
│
├── models/
│ ├── yolov8n.pt
│ ├── best_50epochs.pt
│ ├── best_85epochs.pt
│
├── runs/
│ ├── video_results/
│
├── best_val_results/
│ ├── confusion_matrix.png
│ ├── PR_curve.png
│
├── live_feed_alert_system.py
├── video_alert_system.py
├── test.py
├── requirements.txt


---

## 🧪 Methodology

### 1. Dataset Creation
- Custom dataset of real construction site images
- Split into training and testing sets

### 2. Annotation
- Labeled using MakeSense.ai
- YOLO format annotations

### 3. Model Training
- Base model: YOLOv8n
- Training experiments:
  - 50 epochs
  - 85 epochs

### 4. Real-Time Detection
- OpenCV-based live video pipeline
- Frame-by-frame inference

### 5. Alert System
- Detects safety violations
- Sends Discord webhook alerts
- Includes cooldown delay to avoid spam

---

## ⚙️ Tech Stack

- Python
- PyTorch
- Ultralytics YOLOv8
- OpenCV
- NumPy
- Requests

---

## ▶️ Installation & Usage

### 1. Clone Repository
```bash
git clone https://github.com/farhankabir133/SafeSide.git
cd SafeSide
2. Install Dependencies
pip install -r requirements.txt
3. Run Live Detection
python live_feed_alert_system.py
4. Run Video Detection
python video_alert_system.py
🔔 Alert System Workflow
Capture frame from webcam/video
Run YOLOv8 inference
Detect PPE violations
Trigger Discord webhook alert
Apply cooldown to prevent spam alerts
📊 Results
High accuracy in Helmet detection
Strong performance on Safety Vest detection
Minor imbalance in “No Helmet / No Vest” classes
Best performance achieved at ~85 epochs training
🔮 Future Improvements
Improve dataset balance
Deploy cloud-based dashboard
Multi-camera monitoring system
Upgrade to YOLOv8s/m models
Add analytics dashboard
👨‍💻 Authors

Code Catalysts Team

Amal Raj Singh
Manasvi Logani
📜 License

This project is for educational and research purposes.

⭐ Support

If you like this project, consider giving it a star ⭐ on GitHub.


---

If you want, I can also:
- :contentReference[oaicite:0]{index=0}
- or :contentReference[oaicite:1]{index=1}

---

## 🧱 Project Structure
