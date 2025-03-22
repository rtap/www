#!/bin/bash

netstat -tuln | grep 8554
ffplay rtsp://localhost:8554/stream

vlc rtsp://localhost:8554/stream
