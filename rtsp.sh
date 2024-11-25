#!/bin/bash
#ffmpeg -re -i meta.mp4 -metadata title="My Awesome Stream" -vcodec libx264 -tune zerolatency -f rtsp -muxdelay 0.1 rtsp://localhost:554/mystream
ffmpeg -re -i output.mp4 -c:v copy -f rtsp rtsp://localhost:8554/mystream
ffmpeg -re -i input.mp4 -c:v copy -f rtsp rtsp://localhost:8554/mystream
ffmpeg -re -i meta.mp4 -c:v copy -f rtsp rtsp://localhost:8554/mystream
ffmpeg -re -i input.mp4 -c:v copy -f rtsp rtsp://localhost:8554/mystream

#echo rtsp://localhost:8554/mystream
#vlc rtsp://localhost:8554/mystream
#ffplay rtsp://localhost:8554/mystream
exit 1
ffmpeg -i rtsp://192.168.188.225:554/Preview_01_sub -vf "format=rgb24,dlopen=recognition.so:detect:model=model://recognition/model.pb:labels=model://recognition/labels.txt,drawbox=enable='between(t,td_start,td_end)':x='xd':y='yd':w='wd':h='hd':color=yellow:thickness=2" -c:v libx264 -preset fast -crf 23 -f segment -segment_time 300 -strftime 1 ./recognition/tracked.mp4

ffmpeg -i rtsp://192.168.188.225:554/Preview_01_sub \
  -vf "format=rgb24,\
       dlopen=./recognition/recognition.so:detect:\
       model=./recognition/model.pb:\
       labels=./recognitionlabels.txt,\
       drawbox=enable='between(t,\${td_start},\${td_end})':\
       x=\${xd}:y=\${yd}:w=\${wd}:h=\${hd}:\
       color=yellow:thickness=2" \
  -c:v libx264 -preset fast -crf 23 \
  -f segment -segment_time 300 -strftime 1 \
  ./recognition/tracked.mp4


ffmpeg -re -i input.mp4 -c copy -f rtsp rtsp://localhost:8554/yourstream

# Terminal 2: Start streaming
ffmpeg -i rtsp://camera.example.com/stream1 -c copy -f rtsp rtsp://localhost:8554/camera1

gst-launch-1.0 -v filesrc location=input.mp4 ! qtdemux ! rtph264pay config-interval=1 pt=96 ! gdppay ! tcpserversink host=localhost port=8554


# Terminal 3: Start recording
#ffmpeg -i rtsp://localhost:8554/yourstream -c copy output.mp4
gst-launch-1.0 -v filesrc location=input.mp4 ! decodebin ! x264enc ! rtph264pay config-interval=1 pt=96 ! gdppay ! tcpserversink host=localhost port=8554

sudo lsof -i :8554
ffplay rtsp://localhost:8554/mystream

# Terminal 4: Start playing
ffplay rtsp://localhost:8554/yourstream
rtsp://localhost:8554/camera1
vlc rtsp://localhost:8554/yourstream
cvlc rtsp://localhost:8554/mystream

ffmpeg -re -i input.mp4 -c:v copy -f rtsp rtsp://localhost:8554/yourstream.sdp



gst-rtsp-server
gst-launch-1.0 -v filesrc location=input.mp4 ! decodebin ! x264enc tune=zerolatency ! rtph264pay pt=96 config-interval=1 ! gdppay ! udpsink host=localhost port=8554

vlc rtsp://localhost:8554/yourstream
