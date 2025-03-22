#!/bin/bash

echo "Instalowanie serwera RTSP (MediaMTX, dawniej rtsp-simple-server)..."

# Sprawdź, czy MediaMTX jest już zainstalowany
if command -v mediamtx &> /dev/null; then
    echo "MediaMTX jest już zainstalowany."
    exit 0
fi

# Określ architekturę systemu
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        ARCH_NAME="amd64"
        ;;
    aarch64|arm64)
        ARCH_NAME="arm64"
        ;;
    armv7*)
        ARCH_NAME="armv7"
        ;;
    *)
        echo "Nieobsługiwana architektura: $ARCH"
        exit 1
        ;;
esac

# Określ system operacyjny
OS=$(uname -s)
case $OS in
    Linux)
        OS_NAME="linux"
        ;;
    Darwin)
        OS_NAME="darwin"
        ;;
    *)
        echo "Nieobsługiwany system operacyjny: $OS"
        exit 1
        ;;
esac

# Pobierz najnowszą wersję MediaMTX
echo "Pobieranie najnowszej wersji MediaMTX dla $OS_NAME-$ARCH_NAME..."
LATEST_VERSION=$(curl -s https://api.github.com/repos/bluenviron/mediamtx/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')

if [ -z "$LATEST_VERSION" ]; then
    echo "Nie można pobrać informacji o najnowszej wersji. Używanie wersji domyślnej v1.3.0."
    LATEST_VERSION="v1.3.0"
fi

echo "Najnowsza wersja: $LATEST_VERSION"
# Poprawiony format URL
DOWNLOAD_URL="https://github.com/bluenviron/mediamtx/releases/download/${LATEST_VERSION}/mediamtx_${LATEST_VERSION}_${OS_NAME}_${ARCH_NAME}.tar.gz"

# Utwórz tymczasowy katalog
TMP_DIR=$(mktemp -d)
cd $TMP_DIR

# Pobierz i rozpakuj
echo "Pobieranie z: $DOWNLOAD_URL"
curl -L -o mediamtx.tar.gz "$DOWNLOAD_URL"
if [ $? -ne 0 ]; then
    echo "Błąd podczas pobierania MediaMTX."
    exit 1
fi

tar -xzf mediamtx.tar.gz
if [ $? -ne 0 ]; then
    echo "Błąd podczas rozpakowywania MediaMTX."
    exit 1
fi

# Zainstaluj MediaMTX
echo "Instalowanie MediaMTX..."
if [ -f "./mediamtx" ]; then
    sudo mv ./mediamtx /usr/local/bin/
    if [ $? -ne 0 ]; then
        echo "Błąd podczas instalowania MediaMTX. Próba alternatywnej metody..."
        # Alternatywna metoda instalacji
        mkdir -p $HOME/bin
        mv ./mediamtx $HOME/bin/
        echo 'export PATH=$PATH:$HOME/bin' >> $HOME/.bashrc
        export PATH=$PATH:$HOME/bin
        echo "MediaMTX zainstalowany w $HOME/bin. Uruchom 'source $HOME/.bashrc' lub uruchom nowy terminal."
    else
        echo "MediaMTX zainstalowany w /usr/local/bin."
    fi
else
    echo "Plik mediamtx nie został znaleziony po rozpakowaniu. Sprawdzanie zawartości katalogu:"
    ls -la
    # Szukaj pliku mediamtx w podkatalogach
    MEDIAMTX_PATH=$(find . -name "mediamtx" -type f)
    if [ ! -z "$MEDIAMTX_PATH" ]; then
        echo "Znaleziono mediamtx w: $MEDIAMTX_PATH"
        sudo mv "$MEDIAMTX_PATH" /usr/local/bin/
        if [ $? -ne 0 ]; then
            echo "Błąd podczas instalowania MediaMTX. Próba alternatywnej metody..."
            mkdir -p $HOME/bin
            mv "$MEDIAMTX_PATH" $HOME/bin/
            echo 'export PATH=$PATH:$HOME/bin' >> $HOME/.bashrc
            export PATH=$PATH:$HOME/bin
            echo "MediaMTX zainstalowany w $HOME/bin. Uruchom 'source $HOME/.bashrc' lub uruchom nowy terminal."
        else
            echo "MediaMTX zainstalowany w /usr/local/bin."
        fi
    else
        echo "Nie znaleziono pliku mediamtx. Instalacja nie powiodła się."
        exit 1
    fi
fi

# Wyczyść tymczasowy katalog
cd - > /dev/null
rm -rf $TMP_DIR

# Sprawdź, czy instalacja się powiodła
if command -v mediamtx &> /dev/null; then
    echo "Instalacja MediaMTX zakończona sukcesem."
    
    # Utwórz podstawowy plik konfiguracyjny
    CONFIG_DIR="$HOME/.mediamtx"
    CONFIG_FILE="$CONFIG_DIR/mediamtx.yml"
    
    mkdir -p "$CONFIG_DIR"
    
    cat > "$CONFIG_FILE" << EOL
# MediaMTX configuration file
paths:
  stream:
    runOnPublish: ffmpeg -i rtsp://localhost:8554/stream -c copy -f mp4 stream.mp4
    runOnDemand: ffmpeg -re -stream_loop -1 -i test.mp4 -c copy -f rtsp rtsp://localhost:8554/stream
protocols:
  rtsp:
    rtspAddress: :8554
EOL
    
    echo "Utworzono podstawowy plik konfiguracyjny w $CONFIG_FILE"
    echo "Aby uruchomić serwer RTSP, wykonaj: mediamtx"
    echo "Serwer RTSP będzie dostępny pod adresem: rtsp://localhost:8554"
else
    echo "Instalacja MediaMTX nie powiodła się."
    exit 1
fi