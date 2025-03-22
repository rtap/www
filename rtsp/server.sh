#!/bin/bash

ps aux | grep -i rtsp
sudo lsof -i :8554



ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
       -f rtsp -rtsp_transport tcp rtsp://localhost:8554/stream &

ffmpeg -f v4l2 -framerate 30 -video_size 1280x720 -i /dev/video0 \
   -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
   -f rtsp -rtsp_transport tcp rtsp://localhost:8554/stream &