#!/bin/bash
#fedora
sudo dnf install vlc-plugin-gstreamer vlc-plugin-ffmpeg
sudo dnf install ffmpeg
sudo dnf install gstreamer1 gstreamer1-plugins-bad-free gstreamer1-plugins-base gstreamer1-plugins-good gstreamer1-plugins-ugly

#python
pip install python-dotenv opencv-python websockets

#nodejs
npm install ws node-rtsp-stream express cors
npm install dotenv ws node-rtsp-stream express cors
npm install winston
sudo apt-get update
sudo apt-get install ffmpeg
npm install node-rtsp-stream winston

# Podstawowe narzędzia developerskie
sudo dnf groupinstall "Development Tools"

# FFmpeg i wymagane biblioteki
sudo dnf install ffmpeg ffmpeg-devel

# Node.js zależności do kompilacji canvas
sudo dnf install cairo-devel pango-devel libjpeg-turbo-devel giflib-devel


# Dodatkowe zależności dla canvas
sudo dnf install libpng-devel jpeg-devel pango-devel cairo-devel giflib-devel
npm install canvas --build-from-source


chmod -R 755 media/
chmod -R 755 received_frames/