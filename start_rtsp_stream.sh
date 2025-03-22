#!/bin/bash
set -e  # Exit on error

# Function for error handling
handle_error() {
  echo "Error occurred at line $LINENO"
  exit 1
}
trap 'handle_error $LINENO' ERR

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

# Zatrzymaj istniejący serwer RTSP, jeśli działa
if nc -z localhost 8554 2>/dev/null; then
    echo "Zatrzymywanie istniejącego serwera RTSP..."
    pkill mediamtx || true  # Don't fail if no process is running
    sleep 2
fi

echo "Uruchamianie serwera RTSP z nową konfiguracją..."
# Uruchom MediaMTX w tle z naszym plikiem konfiguracyjnym
mediamtx &
RTSP_SERVER_PID=$!

# Daj serwerowi czas na uruchomienie
sleep 2

# Sprawdź, czy serwer faktycznie działa
if ! nc -z localhost 8554 2>/dev/null; then
    echo "Błąd: Nie udało się uruchomić serwera RTSP"
    exit 1
fi

echo "Serwer RTSP uruchomiony."

# Uruchom generator strumienia z opcją testowego wzoru
echo "Uruchamianie generatora strumienia z testowym wzorem..."
echo "1" | ./generate_rtsp_stream.sh

# Informacja dla użytkownika
echo ""
echo "Strumień RTSP jest dostępny pod adresem: rtsp://localhost:8554/stream"
echo "Możesz go przetestować za pomocą FFplay: ffplay rtsp://localhost:8554/stream"
echo ""
echo "Naciśnij Ctrl+C, aby zatrzymać strumień."

# Dodaj obsługę sygnału przerwania, aby poprawnie zamknąć procesy
cleanup() {
    echo "Zatrzymywanie serwera RTSP..."
    pkill mediamtx || true
    exit 0
}
trap cleanup INT TERM
wait $RTSP_SERVER_PID
