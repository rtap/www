#!/bin/bash

echo "Uruchamianie serwera RTMP..."

# Sprawdź, czy skrypt instalacyjny istnieje
if [ ! -f "./install_rtmp_server.sh" ]; then
    echo "Błąd: Nie znaleziono skryptu install_rtmp_server.sh"
    exit 1
fi

# Nadaj uprawnienia wykonywania, jeśli nie ma
if [ ! -x "./install_rtmp_server.sh" ]; then
    chmod +x ./install_rtmp_server.sh
fi

# Uruchom skrypt instalacyjny
./install_rtmp_server.sh

# Zatrzymaj nginx, jeśli już działa
echo "Zatrzymywanie istniejących instancji nginx..."
sudo systemctl stop nginx 2>/dev/null
sudo killall nginx 2>/dev/null

# Uruchom nginx z konfiguracją RTMP
echo "Uruchamianie serwera RTMP (nginx z modułem RTMP)..."
sudo nginx -c /tmp/nginx-rtmp.conf

echo "Serwer RTMP został uruchomiony."
echo "Strumień RTMP będzie dostępny pod adresem: rtmp://localhost:1935/live/stream"
echo "Strumień HLS będzie dostępny pod adresem: http://localhost:8080/hls/stream.m3u8"
echo ""
echo "Aby zatrzymać serwer, wykonaj: sudo nginx -s stop"