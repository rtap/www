#!/bin/bash
ffmpeg -i input.mp4 -metadata key1="value1" -metadata key2="value2" -c copy meta.mp4
#ffmpeg -i output.mp4 -metadata title="My Awesome Video" -metadata author="John Doe" -metadata year="2024" -metadata description="A great video about FFmpeg" -c copy metadata.mp4
#vlc meta.mp4
ffplay meta.mp4