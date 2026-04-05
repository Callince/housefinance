"""WSGI entry point for PythonAnywhere.

PythonAnywhere uses WSGI but FastAPI is ASGI. We use a2wsgi to bridge them.

On PythonAnywhere, in the Web tab, set:
  WSGI configuration file → point to this file
  And in that file: from wsgi import application
"""
import os
import sys

# Add this directory to Python path so `app` module is found
project_dir = os.path.dirname(os.path.abspath(__file__))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

# Load .env file if present (for local testing)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(project_dir, ".env"))
except ImportError:
    pass

from a2wsgi import ASGIMiddleware
from app.main import app as fastapi_app

# WSGI-compatible application (this is what PythonAnywhere will serve)
application = ASGIMiddleware(fastapi_app)
