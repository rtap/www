#!/bin/bash
set -e

# Function for error handling
handle_error() {
  echo "Error occurred at line $LINENO"
  exit 1
}
trap 'handle_error $LINENO' ERR

echo "Instalowanie serwera RTSP MediaMTX..."

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo "curl is not installed. Please install it."
    exit 1
fi

# Check if wget is installed
if ! command -v wget &> /dev/null; then
    echo "wget is not installed. Please install it."
    exit 1
fi

# Check if the system is Linux
if [[ "$OSTYPE" != "linux-gnu" ]]; then
    echo "This script is designed for Linux systems only."
    exit 1
fi

# Check if the system is 64-bit
if [[ "$(uname -m)" != "x86_64" ]]; then
    echo "This script is designed for 64-bit systems only."
    exit 1
fi

# Download MediaMTX
echo "Pobieranie MediaMTX..."
LATEST_VERSION=$(curl -s https://api.github.com/repos/bluenviron/mediamtx/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
wget -q https://github.com/bluenviron/mediamtx/releases/download/${LATEST_VERSION}/mediamtx_${LATEST_VERSION}_linux_amd64.tar.gz
tar -xzf mediamtx_${LATEST_VERSION}_linux_amd64.tar.gz
rm mediamtx_${LATEST_VERSION}_linux_amd64.tar.gz

# Move the executable to /usr/local/bin
sudo mv mediamtx /usr/local/bin/
sudo chmod +x /usr/local/bin/mediamtx

# Create the configuration directory if it doesn't exist
sudo mkdir -p /usr/local/etc/mediamtx

# Download the compatible configuration file
echo "Pobieranie kompatybilnego pliku konfiguracyjnego..."
wget -q https://raw.githubusercontent.com/rtap/www/main/mediamtx.yml -O /usr/local/etc/mediamtx/mediamtx.yml

# Set permissions for the configuration file
sudo chmod 644 /usr/local/etc/mediamtx/mediamtx.yml

echo "MediaMTX został zainstalowany i skonfigurowany."