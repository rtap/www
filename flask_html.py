#!/bin/python
from flask import Flask, Response, send_file, render_template

app = Flask(__name__)

# Serve index1.html file
# Serve index.html file
@app.route('/')
def index2():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)