# 🦺 SafeSide – AI-Based Real-Time PPE Detection & Safety Monitoring System

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-green.svg)
![OpenCV](https://img.shields.io/badge/OpenCV-Computer_Vision-orange.svg)
![PyTorch](https://img.shields.io/badge/PyTorch-Deep_Learning-red.svg)
![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen.svg)
![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)

> **SafeSide is a real-time AI-powered safety monitoring system that detects Personal Protective Equipment (PPE) compliance (helmets & safety vests) using YOLOv8 and triggers instant alerts when violations are detected.**

---

## 📌 Project Overview

Construction and industrial environments require strict safety compliance. Manual monitoring is inefficient, error-prone, and costly.

**SafeSide solves this problem using computer vision and deep learning**, enabling automatic detection of safety violations in real time through CCTV/webcam/video feeds.

The system identifies:

- 🪖 Helmet
- ❌ No Helmet
- 🦺 Safety Vest
- ❌ No Safety Vest

When violations are detected, the system sends **instant alerts via Discord webhook integration**.

---

## 🚀 Key Features

### 🔍 Real-Time PPE Detection
- Powered by **YOLOv8 (Ultralytics)**
- Optimized for fast inference on live webcam/video streams
- Bounding box visualization for detected objects

### 🧠 Custom-Trained Deep Learning Model
- Trained on a custom PPE dataset (`Data_CV/`)
- YOLO-format annotated images
- Multiple training runs (50 & 85 epochs)

### 📹 Dual Input Support
- Live webcam detection (`live_feed_alert_system.py`)
- Video file analysis (`video_alert_system.py`)

### 🚨 Smart Alert System
- Discord webhook integration for real-time violation alerts
- Cooldown mechanism to prevent spam notifications
- Trigger-based safety violation detection logic

### 📊 Model Evaluation & Visualization
- Confusion matrix analysis
- Precision–Recall curves
- Training performance comparison (50 vs 85 epochs)

---

## 🧱 Project Structure
SafeSide/
│
├── Data_CV/ # Dataset (YOLO format)
│ ├── train/
│ ├── test/
│ ├── data.yaml
│
├── models/ # Trained models
│ ├── yolov8n.pt # Base model
│ ├── best_50epochs.pt # Training run 1
│ ├── best_85epochs.pt # Training run 2 (improved)
│
├── runs/ # Inference outputs
│ ├── video_results/
│
├── best_val_results/ # Evaluation outputs
│ ├── confusion_matrix.png
│ ├── PR_curve.png
│
├── live_feed_alert_system.py # Real-time webcam detection + alerts
├── video_alert_system.py # Video-based detection pipeline
├── test.py # Model testing script
├── requirements.txt
└── README.md


---

## 🧪 System Workflow

### 1️⃣ Data Preparation
- Images collected from real-world construction scenarios
- Annotated using YOLO labeling format
- Dataset split into training and testing sets

### 2️⃣ Model Training
- Base architecture: **YOLOv8n**
- Training performed on GPU (Google Colab / local GPU)
- Experiments conducted:
  - 50 epochs (baseline)
  - 85 epochs (improved performance)

### 3️⃣ Real-Time Detection Pipeline
- Frame captured from webcam or video file
- YOLO model performs inference
- Bounding boxes drawn for PPE detection

### 4️⃣ Safety Alert Logic
- If "No Helmet" or "No Vest" detected:
  - Trigger Discord webhook alert
  - Include cooldown delay (prevents spam)

---

## ⚙️ Tech Stack

- Python
- PyTorch
- Ultralytics YOLOv8
- OpenCV
- NumPy
- Requests (Webhook API)
- Google Colab (Training environment)

---

## ▶️ Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/farhankabir133/SafeSide.git
cd SafeSide

2. Install Dependencies
pip install -r requirements.txt
3. Run Live Webcam Detection
python live_feed_alert_system.py
4. Run Video-Based Detection
python video_alert_system.py



## 📊 Model Performance Summary

- 🪖 Strong performance in Helmet detection  
- 🦺 High accuracy in Vest detection  
- ⚠️ Slight imbalance in "No Helmet / No Vest" classes  
- 📈 Best performance observed after extended training (85 epochs)  

---

## 🚨 Alert System Design

- Capture frame from input stream  
- Run YOLOv8 inference  
- Detect PPE violation classes  
- Trigger Discord webhook alert  
- Apply cooldown timer (anti-spam mechanism)  

---

## 🔮 Future Improvements

- 📊 Improve dataset balance (especially violation classes)  
- 🌐 Web dashboard for real-time monitoring  
- 📡 Multi-camera support for large construction sites  
- 🧠 Upgrade to YOLOv8s / YOLOv8m for higher accuracy  
- 📈 Add analytics dashboard (daily safety reports)  

---

## 👨‍💻 Authors

**Code Catalysts Team**
- Amal Raj Singh  
- Manasvi Logani  

---

## 📜 License

This project is released for educational and research purposes.

---

## ⭐ Support

If you find this project useful:

- Give it a ⭐ on GitHub  
- Fork it and improve it  
- Share it with the AI/ML community  
