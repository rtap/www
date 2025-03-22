#!/bin/bash

# Sprawdzenie, czy mediamtx jest zainstalowany
if ! command -v mediamtx &> /dev/null; then
    echo "MediaMTX nie jest zainstalowany. Instalowanie..."
    ./install_rtsp_server.sh
    
    # Sprawdzenie, czy instalacja się powiodła
    if ! command -v mediamtx &> /dev/null; then
        echo "Nie udało się zainstalować MediaMTX. Sprawdź logi instalacji."
        exit 1
    fi
fi

# Uruchomienie serwera RTSP w tle
echo "Uruchamianie serwera RTSP (MediaMTX)..."
mediamtx &
MEDIAMTX_PID=$!

# Funkcja do zatrzymania serwera przy wyjściu
cleanup() {
    echo "Zatrzymywanie serwera RTSP..."
    kill $MEDIAMTX_PID 2>/dev/null
    exit 0
}

# Przechwytywanie sygnałów zakończenia
trap cleanup SIGINT SIGTERM

echo "Serwer RTSP uruchomiony na rtsp://localhost:8554/"
echo "Naciśnij Ctrl+C, aby zatrzymać serwer."

# Czekanie na zakończenie serwera
wait $MEDIAMTX_PID