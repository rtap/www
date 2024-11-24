#!/bin/bash
rm input.mp4
#ffmpeg -f lavfi -i testsrc=duration=30:size=1280x720:rate=30 -c:v libx264 -crf 23 -preset medium -pix_fmt yuv420p input.mp4
ffmpeg -f lavfi -i testsrc=duration=30:size=1280x720:rate=30 -c:v libx264 -crf 23 -preset medium -pix_fmt yuv420p -metadata title="My Awesome Video" -metadata author="John Doe" -metadata year="2024" -metadata description="A great video about FFmpeg" input.mp4
vlc input.mp4
#ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4
#vlc output.mp4