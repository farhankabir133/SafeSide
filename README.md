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

---

## 🧱 Project Structure
