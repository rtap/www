#!/bin/bash
lsof -i tcp:8554
lsof -i tcp:5001
fuser -k 5001/tcp
sleep 2
node server.js
lsof -i tcp:5001
