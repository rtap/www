#!/bin/bash

# Sprawdzenie, czy FFmpeg jest zainstalowany
if ! command -v ffmpeg &> /dev/null; then
    echo "FFmpeg nie jest zainstalowany. Zainstaluj FFmpeg, aby kontynuować."
    exit 1
fi

# Funkcja do zatrzymania FFmpeg przy wyjściu
cleanup() {
    echo "Zatrzymywanie strumienia..."
    if [ ! -z "$FFMPEG_PID" ]; then
        kill $FFMPEG_PID 2>/dev/null
    fi
    exit 0
}

# Przechwytywanie sygnałów zakończenia
trap cleanup SIGINT SIGTERM

# Wybór typu strumienia
echo "Wybierz typ strumienia:"
echo "1. RTMP (rtmp://localhost:1935/live/stream)"
echo "2. HLS (http://localhost:8080/hls/stream.m3u8)"
read -p "Wybierz opcję (1-2): " STREAM_TYPE

# Wybór źródła strumienia
echo "Wybierz źródło strumienia:"
echo "1. Testowy wzór (test pattern)"
echo "2. Plik wideo (jeśli istnieje)"
echo "3. Kamera internetowa (jeśli dostępna)"
read -p "Wybierz opcję (1-3): " SOURCE_TYPE

# Ustawienie katalogu dla HLS
if [ "$STREAM_TYPE" = "2" ]; then
    mkdir -p /tmp/hls
    # Uruchomienie prostego serwera HTTP dla HLS
    echo "Uruchamianie serwera HTTP na porcie 8080..."
    cd /tmp && python3 -m http.server 8080 &
    HTTP_SERVER_PID=$!
    cd - > /dev/null
fi

# Generowanie strumienia
case $SOURCE_TYPE in
    1)
        echo "Generowanie strumienia testowego..."
        if [ "$STREAM_TYPE" = "1" ]; then
            # RTMP
            ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
                   -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                   -f flv rtmp://localhost:1935/live/stream &
            FFMPEG_PID=$!
            echo "Strumień RTMP jest generowany na adresie: rtmp://localhost:1935/live/stream"
        else
            # HLS
            ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
                   -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                   -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \
                   /tmp/hls/stream.m3u8 &
            FFMPEG_PID=$!
            echo "Strumień HLS jest generowany na adresie: http://localhost:8080/hls/stream.m3u8"
        fi
        ;;
    2)
        # Sprawdzenie, czy istnieje plik wideo
        if [ -f "/home/tom/github/rtap/www/input.mp4" ]; then
            echo "Używanie pliku input.mp4 jako źródła..."
            if [ "$STREAM_TYPE" = "1" ]; then
                # RTMP
                ffmpeg -re -i "/home/tom/github/rtap/www/input.mp4" \
                       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                       -c:a aac -b:a 128k \
                       -f flv rtmp://localhost:1935/live/stream &
                FFMPEG_PID=$!
                echo "Strumień RTMP jest generowany na adresie: rtmp://localhost:1935/live/stream"
            else
                # HLS
                ffmpeg -re -i "/home/tom/github/rtap/www/input.mp4" \
                       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                       -c:a aac -b:a 128k \
                       -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \
                       /tmp/hls/stream.m3u8 &
                FFMPEG_PID=$!
                echo "Strumień HLS jest generowany na adresie: http://localhost:8080/hls/stream.m3u8"
            fi
        else
            echo "Plik input.mp4 nie istnieje. Generowanie strumienia testowego..."
            if [ "$STREAM_TYPE" = "1" ]; then
                # RTMP
                ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
                       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                       -f flv rtmp://localhost:1935/live/stream &
                FFMPEG_PID=$!
                echo "Strumień RTMP jest generowany na adresie: rtmp://localhost:1935/live/stream"
            else
                # HLS
                ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
                       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                       -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \
                       /tmp/hls/stream.m3u8 &
                FFMPEG_PID=$!
                echo "Strumień HLS jest generowany na adresie: http://localhost:8080/hls/stream.m3u8"
            fi
        fi
        ;;
    3)
        echo "Próba użycia kamery internetowej..."
        # Sprawdzenie, czy kamera jest dostępna
        if [ -c /dev/video0 ]; then
            if [ "$STREAM_TYPE" = "1" ]; then
                # RTMP
                ffmpeg -f v4l2 -framerate 30 -video_size 1280x720 -i /dev/video0 \
                       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                       -f flv rtmp://localhost:1935/live/stream &
                FFMPEG_PID=$!
                echo "Strumień RTMP jest generowany na adresie: rtmp://localhost:1935/live/stream"
            else
                # HLS
                ffmpeg -f v4l2 -framerate 30 -video_size 1280x720 -i /dev/video0 \
                       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                       -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \
                       /tmp/hls/stream.m3u8 &
                FFMPEG_PID=$!
                echo "Strumień HLS jest generowany na adresie: http://localhost:8080/hls/stream.m3u8"
            fi
        else
            echo "Kamera nie jest dostępna. Generowanie strumienia testowego..."
            if [ "$STREAM_TYPE" = "1" ]; then
                # RTMP
                ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
                       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                       -f flv rtmp://localhost:1935/live/stream &
                FFMPEG_PID=$!
                echo "Strumień RTMP jest generowany na adresie: rtmp://localhost:1935/live/stream"
            else
                # HLS
                ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
                       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                       -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \
                       /tmp/hls/stream.m3u8 &
                FFMPEG_PID=$!
                echo "Strumień HLS jest generowany na adresie: http://localhost:8080/hls/stream.m3u8"
            fi
        fi
        ;;
    *)
        echo "Nieprawidłowa opcja. Generowanie strumienia testowego..."
        if [ "$STREAM_TYPE" = "1" ]; then
            # RTMP
            ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
                   -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                   -f flv rtmp://localhost:1935/live/stream &
            FFMPEG_PID=$!
            echo "Strumień RTMP jest generowany na adresie: rtmp://localhost:1935/live/stream"
        else
            # HLS
            ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
                   -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                   -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments \
                   /tmp/hls/stream.m3u8 &
            FFMPEG_PID=$!
            echo "Strumień HLS jest generowany na adresie: http://localhost:8080/hls/stream.m3u8"
        fi
        ;;
esac

echo "Naciśnij Ctrl+C, aby zatrzymać strumień."

# Czekanie na zakończenie FFmpeg
wait $FFMPEG_PID

# Zatrzymanie serwera HTTP, jeśli był uruchomiony
if [ ! -z "$HTTP_SERVER_PID" ]; then
    kill $HTTP_SERVER_PID 2>/dev/null
fi