#!/bin/bash

echo "Uruchamianie generatora strumienia RTSP..."

# Sprawdź, czy skrypty istnieją
if [ ! -f "./install_rtsp_server.sh" ]; then
    echo "Błąd: Nie znaleziono skryptu install_rtsp_server.sh"
    exit 1
fi

if [ ! -f "./generate_rtsp_stream.sh" ]; then
    echo "Błąd: Nie znaleziono skryptu generate_rtsp_stream.sh"
    exit 1
fi

# Nadaj uprawnienia wykonywania, jeśli nie mają
if [ ! -x "./install_rtsp_server.sh" ]; then
    chmod +x ./install_rtsp_server.sh
fi

if [ ! -x "./generate_rtsp_stream.sh" ]; then
    chmod +x ./generate_rtsp_stream.sh
fi

# Sprawdź, czy MediaMTX jest zainstalowany
if ! command -v mediamtx &> /dev/null; then
    echo "MediaMTX nie jest zainstalowany. Instalowanie..."
    ./install_rtsp_server.sh
fi

# Sprawdź, czy port 8554 jest już używany
if nc -z localhost 8554 2>/dev/null; then
    echo "Serwer RTSP już działa na porcie 8554."
else
    echo "Uruchamianie serwera RTSP..."
    # Uruchom MediaMTX w tle
    mediamtx &
    RTSP_SERVER_PID=$!
    # Daj serwerowi czas na uruchomienie
    sleep 2
    echo "Serwer RTSP uruchomiony."
fi

# Uruchom generator strumienia z opcją testowego wzoru
echo "Uruchamianie generatora strumienia z testowym wzorem..."
echo "1" | ./generate_rtsp_stream.sh

# Informacja dla użytkownika
echo ""
echo "Strumień RTSP jest dostępny pod adresem: rtsp://localhost:8554/stream"
echo "Możesz go przetestować za pomocą FFplay: ffplay rtsp://localhost:8554/stream"
echo ""
echo "Naciśnij Ctrl+C, aby zatrzymać strumień."