#!/bin/bash
lsof -i tcp:8554
fuser -k 8554/tcp

vlc rtsp://localhost:8554/stream
vlc rtsp://192.168.188.226:8554/stream
lsof -i tcp:5001
fuser -k 5001/tcp
node server.js
lsof -i tcp:5001
