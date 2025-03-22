#!/bin/bash

# Sprawdzenie, czy mediamtx jest zainstalowany
if ! command -v mediamtx &> /dev/null; then
    echo "Serwer RTSP (mediamtx) nie jest zainstalowany."
    echo "Instalowanie serwera RTSP..."
    
    # Uruchomienie skryptu instalacyjnego
    bash /home/tom/github/rtap/www/install_rtsp_server.sh
fi

# Uruchomienie serwera RTSP w tle
echo "Uruchamianie serwera RTSP..."
mediamtx &
MEDIAMTX_PID=$!

# Daj serwerowi czas na uruchomienie
sleep 2

# Funkcja do zatrzymania wszystkich procesów przy wyjściu
cleanup() {
    echo "Zatrzymywanie strumienia i serwera..."
    if [ ! -z "$FFMPEG_PID" ]; then
        kill $FFMPEG_PID 2>/dev/null
    fi
    if [ ! -z "$MEDIAMTX_PID" ]; then
        kill $MEDIAMTX_PID 2>/dev/null
    fi
    exit 0
}

# Przechwytywanie sygnałów zakończenia
trap cleanup SIGINT SIGTERM

# Generowanie strumienia testowego i wysyłanie go do serwera RTSP
echo "Generowanie strumienia testowego..."
ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
       -f rtsp rtsp://localhost:8554/stream &
FFMPEG_PID=$!

echo "Strumień RTSP jest generowany na adresie: rtsp://localhost:8554/stream"
echo "Naciśnij Ctrl+C, aby zatrzymać strumień i serwer."

# Czekanie na zakończenie FFmpeg
wait $FFMPEG_PID