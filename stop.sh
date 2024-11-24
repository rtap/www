#!/bin/bash

fuser -k 8080/tcp
fuser -k 5001/tcp

lsof -i 5001
kill $(lsof -t -i :5001)