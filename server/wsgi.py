import os
from flask import Flask, send_from_directory

app = Flask(__name__)
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

@app.route('/')
@app.route('/index.html')
def index():
    return send_from_directory(root, 'index.html')

@app.route('/reveal')
@app.route('/reveal.html')
def reveal():
    return send_from_directory(root, 'reveal.html')

@app.route('/<path:filename>')
def static_file(filename):
    return send_from_directory(root, filename)
