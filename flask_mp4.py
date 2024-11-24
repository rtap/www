#!/bin/python
from flask import Flask, Response
import cv2

app = Flask(__name__)

#add index.html file
@app.route('/index.html')
def index():
    with open('index.html', 'r') as file:
        return file.read()

# Generate frames from the video and serve them as HTTP response
def generate_frame():
    cap = cv2.VideoCapture("input.mp4")  # Replace with the path to your video file

    while True:
        success, frame = cap.read()
        if not success:
            break

        # Encode frame to JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        # Yield frame in byte format
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def video_feed():
    return Response(generate_frame(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


import cv2
import vlc

def stream_video_to_rtsp():
    # Using VLC's sout function for setting up RTSP
    vlc_instance = vlc.Instance()
    media_player = vlc_instance.media_player_new()
    media = vlc_instance.media_new('file:///path/to/input.mp4')

    # Configure RTP/RTSP Stream Output
    media.add_option("sout=#rtp{mux=ts,dst=127.0.0.1,port=8554,sdp=rtsp://127.0.0.1:8554/stream}")
    media.add_option("sout-all")
    media.add_option("sout-keep")

    media_player.set_media(media)
    media_player.play()

    # Keep the stream running
    try:
        while True:
            pass
    except KeyboardInterrupt:
        media_player.stop()
        print("Stream stopped")

if __name__ == '__main__':
    stream_video_to_rtsp()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)