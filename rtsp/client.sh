#!/bin/bash

ps aux | grep -i rtsp
sudo lsof -i :8554

find ~ -name "mediamtx.yml" -o -name "*.conf" | grep -i rtsp


netstat -tuln | grep 8554

ffplay rtsp://localhost:8554/stream

vlc rtsp://localhost:8554/stream

