#!/bin/bash

echo "Naprawianie problemu ze strumieniem RTSP..."

# Zatrzymaj istniejące procesy
echo "Zatrzymywanie istniejących procesów..."
pkill mediamtx
pkill ffmpeg
sleep 2

# Uruchom MediaMTX z domyślną konfiguracją
echo "Uruchamianie serwera RTSP..."
mediamtx &
RTSP_SERVER_PID=$!
sleep 3

# Generuj strumień testowy
echo "Generowanie strumienia testowego..."
echo "Strumień RTSP będzie dostępny pod adresem: rtsp://localhost:8554/stream"

# Użyj FFmpeg z protokołem UDP zamiast TCP
ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
       -f rtsp -rtsp_transport udp rtsp://localhost:8554/stream

echo "Strumień RTSP jest dostępny pod adresem: rtsp://localhost:8554/stream"
echo "Możesz go przetestować za pomocą FFplay: ffplay -rtsp_transport udp rtsp://localhost:8554/stream"