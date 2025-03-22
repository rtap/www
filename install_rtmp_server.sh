#!/bin/bash

echo "Instalowanie serwera RTMP (nginx z modułem RTMP)..."

# Sprawdź, czy nginx jest już zainstalowany
if command -v nginx >/dev/null 2>&1; then
    echo "Nginx jest już zainstalowany."
else
    echo "Instalowanie nginx..."
    sudo dnf install -y nginx
fi

# Sprawdź, czy moduł RTMP jest już zainstalowany
if rpm -q nginx-mod-rtmp >/dev/null 2>&1; then
    echo "Moduł RTMP dla nginx jest już zainstalowany."
else
    echo "Instalowanie modułu RTMP dla nginx..."
    sudo dnf install -y nginx-mod-rtmp
fi

# Tworzenie konfiguracji RTMP
echo "Tworzenie konfiguracji RTMP..."
cat > /tmp/nginx-rtmp.conf << 'EOF'
load_module modules/ngx_rtmp_module.so;

worker_processes auto;
events {
    worker_connections 1024;
}

rtmp {
    server {
        listen 1935;
        chunk_size 4096;

        application live {
            live on;
            record off;
            
            # Opcjonalnie: przekierowanie do HLS
            hls on;
            hls_path /tmp/hls;
            hls_fragment 3;
            hls_playlist_length 60;
        }
    }
}

http {
    server {
        listen 8080;
        
        # Opcjonalnie: serwowanie plików HLS
        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
                video/mp2t ts;
            }
            root /tmp;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }
    }
}
EOF

# Tworzenie katalogu dla HLS, jeśli nie istnieje
sudo mkdir -p /tmp/hls
sudo chmod 777 /tmp/hls

echo "Konfiguracja RTMP została utworzona."
echo "Aby uruchomić serwer RTMP, wykonaj: sudo nginx -c /tmp/nginx-rtmp.conf"