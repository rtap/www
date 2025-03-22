#!/bin/python
from flask import Flask, render_template

app = Flask(__name__)

# Serve index1.html file
@app.route('/')
def index():
    return render_template('index1.html')

# Serve index.html file
@app.route('/index')
def index2():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)