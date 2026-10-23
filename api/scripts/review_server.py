"""Disposable browser-review API, bound to localhost:8011, using RAM only.

Run from api/: .venv/Scripts/python.exe scripts/review_server.py
This does not open or migrate the database configured in .env.
"""

import os
import sys
from pathlib import Path
from wsgiref.simple_server import WSGIServer, make_server

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.test_settings"

import django
from django.conf import settings

settings.CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]
django.setup()

from django.core.management import call_command
from django.core.wsgi import get_wsgi_application

call_command("migrate", verbosity=0, interactive=False)
application = get_wsgi_application()


def review_application(environ, start_response):
    if environ["PATH_INFO"] == "/api/v1/__review__/":
        start_response("200 OK", [("Content-Type", "application/json")])
        return [b'{"disposable_database":true}']
    return application(environ, start_response)


bind = os.getenv("COLLECTFLOW_REVIEW_BIND", "127.0.0.1")
port = int(os.getenv("COLLECTFLOW_REVIEW_PORT", "8011"))
if bind not in ("127.0.0.1", "0.0.0.0"):
    raise SystemExit("Review API supports only local/container bindings.")
print(
    f"Disposable review API: http://{bind}:{port} (empty in-memory database)",
    flush=True,
)


class ReviewServer(WSGIServer):
    # StrictMode plus history requests can exceed wsgiref's five-connection queue.
    request_queue_size = 64


with make_server(bind, port, review_application, server_class=ReviewServer) as server:
    server.serve_forever()
