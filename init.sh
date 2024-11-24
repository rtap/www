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