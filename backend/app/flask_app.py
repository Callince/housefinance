import os
from pathlib import Path
from flask import Flask, send_from_directory


def create_flask_app() -> Flask:
    static_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
    app = Flask(__name__, static_folder=str(static_dir), static_url_path="")

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path):
        if path and (static_dir / path).exists():
            return send_from_directory(str(static_dir), path)
        return send_from_directory(str(static_dir), "index.html")

    return app
