import os
from flask import Flask, send_from_directory, request, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
prefix = os.getenv('GIZMOAPP_URL_PREFIX', '').rstrip('/')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def _allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def _index():
    return send_from_directory(root, 'index.html')

def _reveal():
    return send_from_directory(root, 'reveal.html')

def _static(filename):
    return send_from_directory(root, filename)

def _images():
    files = sorted(
        f for f in os.listdir(root)
        if '.' in f and f.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    )
    return jsonify(files)

def _upload():
    if 'file' not in request.files:
        return jsonify({'error': 'no file'}), 400
    f = request.files['file']
    if not f.filename or not _allowed(f.filename):
        return jsonify({'error': 'unsupported file type'}), 400
    name = secure_filename(f.filename)
    f.save(os.path.join(root, name))
    return jsonify({'filename': name}), 201

app.add_url_rule(prefix + '/',               'index',       _index)
app.add_url_rule(prefix + '/index.html',     'index_html',  _index)
app.add_url_rule(prefix + '/reveal',         'reveal',      _reveal)
app.add_url_rule(prefix + '/reveal.html',    'reveal_html', _reveal)
app.add_url_rule(prefix + '/api/images',     'images',      _images)
app.add_url_rule(prefix + '/api/upload',     'upload',      _upload, methods=['POST'])
app.add_url_rule(prefix + '/<path:filename>', 'app_static', _static)
