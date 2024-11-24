#!/bin/python
from flask import Flask, Response
import cv2

app = Flask(__name__)

#add index.html file
@app.route('/')
def index():
    with open('index.html', 'r') as file:
        return file.read()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)