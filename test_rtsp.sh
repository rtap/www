#!/bin/bash

# Zatrzymaj istniejący serwer RTSP, jeśli działa
if nc -z localhost 8554 2>/dev/null; then
    echo "Zatrzymywanie istniejącego serwera RTSP..."
    pkill mediamtx
    sleep 2
fi

echo "Uruchamianie serwera RTSP..."
# Uruchom MediaMTX w tle
mediamtx ./mediamtx.yml &
RTSP_SERVER_PID=$!
# Daj serwerowi czas na uruchomienie
sleep 3
echo "Serwer RTSP uruchomiony."

echo "Generowanie strumienia testowego..."
echo "Strumień RTSP jest generowany na adresie: rtsp://localhost:8554/stream"
echo "Naciśnij Ctrl+C, aby zatrzymać strumień."

# Uruchom FFmpeg z testowym wzorem i użyj protokołu TCP
ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
       -f rtsp -rtsp_transport tcp rtsp://localhost:8554/stream

echo "Strumień RTSP jest dostępny pod adresem: rtsp://localhost:8554/stream"
echo "Możesz go przetestować za pomocą FFplay: ffplay -rtsp_transport tcp rtsp://localhost:8554/stream"