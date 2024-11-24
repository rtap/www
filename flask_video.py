#!/bin/python
from flask import Flask, Response
import cv2
import vlc

app = Flask(__name__)
print(vlc.__version__)

def stream_video_to_rtsp():
    # Using VLC's sout function for setting up RTSP
    vlc_instance = vlc.Instance()
    media_player = vlc_instance.media_player_new()
    media = vlc_instance.media_new('input.mp4')
    # media = vlc_instance.media_new('meta.mp4')

    # Configure RTP/RTSP Stream Output
    #media.add_option("sout=#rtp{mux=ts,dst=127.0.0.1,port=8554,sdp=rtsp://127.0.0.1:8554/stream}")
    media.add_option(":sout=#rtp{mux=ts,dst=127.0.0.1,port=8554,sdp=rtsp://127.0.0.1:8554/stream}")
    media.add_option(":sout-all")
    media.add_option(":sout-keep")
    #media.add_option("sout-all")
    #media.add_option("sout-keep")

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
