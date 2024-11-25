#!/bin/bash
pip install opencv-python ffmpeg-python python-vlc
pip install opencv-python flask
python flask-server.py
open http://localhost:5000/
open http://localhost:5001/
vlc rtsp://localhost:8554/stream
ffplay rtsp://localhost:8554/stream
rtsp://localhost:8554/stream