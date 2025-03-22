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
    if [ ! -z "$RTSP_SERVER_PID" ]; then
        kill $RTSP_SERVER_PID 2>/dev/null
    fi
    exit 0
}

# Przechwytywanie sygnałów zakończenia
trap cleanup SIGINT SIGTERM

# Sprawdzenie, czy MediaMTX (rtsp-simple-server) jest zainstalowany
check_mediamtx() {
    if command -v mediamtx &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Uruchomienie serwera RTSP, jeśli nie jest już uruchomiony
start_rtsp_server() {
    # Sprawdź, czy port 8554 jest już używany
    if nc -z localhost 8554 2>/dev/null; then
        echo "Serwer RTSP już działa na porcie 8554."
        return 0
    fi
    
    if check_mediamtx; then
        echo "Uruchamianie serwera RTSP (MediaMTX)..."
        mediamtx &
        RTSP_SERVER_PID=$!
        # Daj serwerowi czas na uruchomienie
        sleep 2
        return 0
    else
        echo "MediaMTX (rtsp-simple-server) nie jest zainstalowany."
        echo "Czy chcesz zainstalować MediaMTX? (t/n)"
        read -r odpowiedz
        if [[ "$odpowiedz" =~ ^[Tt]$ ]]; then
            # Sprawdź, czy skrypt instalacyjny istnieje
            if [ -f "./install_rtsp_server.sh" ]; then
                # Nadaj uprawnienia wykonywania, jeśli nie ma
                if [ ! -x "./install_rtsp_server.sh" ]; then
                    chmod +x ./install_rtsp_server.sh
                fi
                # Uruchom skrypt instalacyjny
                ./install_rtsp_server.sh
                
                # Sprawdź, czy instalacja się powiodła
                if check_mediamtx; then
                    echo "Uruchamianie serwera RTSP (MediaMTX)..."
                    mediamtx &
                    RTSP_SERVER_PID=$!
                    # Daj serwerowi czas na uruchomienie
                    sleep 2
                    return 0
                else
                    echo "Nie udało się zainstalować MediaMTX."
                    return 1
                fi
            else
                echo "Skrypt instalacyjny install_rtsp_server.sh nie istnieje."
                return 1
            fi
        else
            echo "Anulowano instalację MediaMTX."
            return 1
        fi
    fi
}

# Uruchom serwer RTSP
if ! start_rtsp_server; then
    echo "Nie można uruchomić serwera RTSP. Kończenie."
    exit 1
fi

# Wybór źródła strumienia
echo "Wybierz źródło strumienia:"
echo "1. Testowy wzór (test pattern)"
echo "2. Plik wideo (jeśli istnieje)"
echo "3. Kamera internetowa (jeśli dostępna)"
read -p "Wybierz opcję (1-3): " SOURCE_TYPE

# Generowanie strumienia
case $SOURCE_TYPE in
    1)
        echo "Generowanie strumienia testowego..."
        ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
               -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
               -f rtsp -rtsp_transport tcp rtsp://localhost:8554/stream &
        FFMPEG_PID=$!
        echo "Strumień RTSP jest generowany na adresie: rtsp://localhost:8554/stream"
        ;;
    2)
        # Sprawdzenie, czy istnieje plik wideo
        if [ -f "/home/tom/github/rtap/www/input.mp4" ]; then
            echo "Używanie pliku input.mp4 jako źródła..."
            ffmpeg -re -i "/home/tom/github/rtap/www/input.mp4" \
                   -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                   -c:a aac -b:a 128k \
                   -f rtsp -rtsp_transport tcp rtsp://localhost:8554/stream &
            FFMPEG_PID=$!
            echo "Strumień RTSP jest generowany na adresie: rtsp://localhost:8554/stream"
        else
            echo "Plik input.mp4 nie istnieje. Generowanie strumienia testowego..."
            ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
                   -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                   -f rtsp rtsp://localhost:8554/stream &
            FFMPEG_PID=$!
            echo "Strumień RTSP jest generowany na adresie: rtsp://localhost:8554/stream"
        fi
        ;;
    3)
        echo "Próba użycia kamery internetowej..."
        # Sprawdzenie, czy kamera jest dostępna
        if [ -c /dev/video0 ]; then
            ffmpeg -f v4l2 -framerate 30 -video_size 1280x720 -i /dev/video0 \
                   -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                   -f rtsp -rtsp_transport tcp rtsp://localhost:8554/stream &
            FFMPEG_PID=$!
            echo "Strumień RTSP jest generowany na adresie: rtsp://localhost:8554/stream"
        else
            echo "Kamera nie jest dostępna. Generowanie strumienia testowego..."
            ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
                   -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
                   -f rtsp rtsp://localhost:8554/stream &
            FFMPEG_PID=$!
            echo "Strumień RTSP jest generowany na adresie: rtsp://localhost:8554/stream"
        fi
        ;;
    *)
        echo "Nieprawidłowa opcja. Generowanie strumienia testowego..."
        ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
               -c:v libx264 -preset ultrafast -tune zerolatency -g 30 \
               -f rtsp -rtsp_transport tcp rtsp://localhost:8554/stream &
        FFMPEG_PID=$!
        echo "Strumień RTSP jest generowany na adresie: rtsp://localhost:8554/stream"
        ;;
esac

echo "Naciśnij Ctrl+C, aby zatrzymać strumień."

# Czekanie na zakończenie FFmpeg
wait $FFMPEG_PID

# Zatrzymanie serwera RTSP, jeśli był uruchomiony przez ten skrypt
if [ ! -z "$RTSP_SERVER_PID" ]; then
    kill $RTSP_SERVER_PID 2>/dev/null
fi