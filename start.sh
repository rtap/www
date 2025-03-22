#!/bin/bash
sudo lsof -i :1935
sudo lsof -i :8008

# Sprawdź czy porty nie są zajęte
lsof -i tcp:8554
fuser -k 8554/tcp
sudo ss -tulpn | grep '1935\|8008'


vlc rtsp://localhost:8554/stream
lsof -i tcp:5001
fuser -k 5001/tcp
node server.js
lsof -i tcp:5001


ffprobe -v error -rtsp_transport tcp -i rtsp://localhost:8554/stream
ffprobe -v error -rtsp_transport tcp -i rtsp://localhost:8554/stream
ffprobe -v error -rtsp_transport tcp -i rtsp://localhost:8554/stream
ffprobe -v error -rtsp_transport tcp -i rtsp://localhost:8554/stream
ffprobe -v error -rtsp_transport tcp -i localhost
ffprobe -v error -rtsp_transport tcp -i localhost


DEBUG=node-media-server node run.js

ffplay rtmp://localhost:1935/live/stream


# Wyczyść stare pliki
rm -rf received_frames/*
rm -rf media/live/*

# Uruchom aplikację
DEBUG=node-media-server node run.js

ffplay -flags2 +export_mvs rtmp://localhost:1935/live/stream


sudo dnf install tesseract tesseract-devel leptonica-devel
npm install node-media-server canvas moment

ffplay rtmp://localhost:1935/live/stream
vlc rtmp://localhost:1935/live/stream