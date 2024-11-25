#!/bin/bash
lsof -i tcp:8554
fuser -k 8554/tcp

vlc rtsp://localhost:8554/stream
vlc rtsp://localhost:8554/stream
lsof -i tcp:5001
fuser -k 5001/tcp
node server.js
lsof -i tcp:5001

vlc rtsp://localhost:8554/stream
vlc rtsp://localhost:8554/stream
vlc rtsp://localhost:8554/stream



ffprobe -v error -rtsp_transport tcp -i rtsp://localhost:8554/stream
ffprobe -v error -rtsp_transport tcp -i rtsp://localhost:8554/stream
ffprobe -v error -rtsp_transport tcp -i rtsp://localhost:8554/stream
ffprobe -v error -rtsp_transport tcp -i rtsp://localhost:8554/stream
ffprobe -v error -rtsp_transport tcp -i localhost
ffprobe -v error -rtsp_transport tcp -i localhost