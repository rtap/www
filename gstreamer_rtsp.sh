#!/bin/bash

# Zatrzymaj istniejący serwer RTSP, jeśli działa
if nc -z localhost 8554 2>/dev/null; then
    echo "Zatrzymywanie istniejącego serwera RTSP..."
    pkill mediamtx
    sleep 2
fi

echo "Uruchamianie serwera RTSP..."
# Uruchom MediaMTX w tle
mediamtx &
RTSP_SERVER_PID=$!
# Daj serwerowi czas na uruchomienie
sleep 3
echo "Serwer RTSP uruchomiony."

echo "Generowanie strumienia testowego z GStreamer..."
echo "Strumień RTSP jest generowany na adresie: rtsp://localhost:8554/stream"
echo "Naciśnij Ctrl+C, aby zatrzymać strumień."

# Uruchom GStreamer z testowym wzorem
gst-launch-1.0 videotestsrc ! video/x-raw,width=1280,height=720,framerate=30/1 ! videoconvert ! x264enc tune=zerolatency ! rtph264pay ! rtspclientsink location=rtsp://localhost:8554/stream

echo "Strumień RTSP jest dostępny pod adresem: rtsp://localhost:8554/stream"
echo "Możesz go przetestować za pomocą FFplay: ffplay -rtsp_transport tcp rtsp://localhost:8554/stream"