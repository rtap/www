#!/bin/bash
pip install opencv-python ffmpeg-python python-vlc
pip install opencv-python flask
python flask-server.py
open http://localhost:5000/
open http://localhost:5001/
vlc rtsp://127.0.0.1:8554/stream
ffplay rtsp://127.0.0.1:8554/stream
rtsp://127.0.0.1:8554/stream