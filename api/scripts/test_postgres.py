"""Run against a newly named disposable PostgreSQL database, never existing data.

Requires CREATEDB permission. Django removes only this newly created test database.
"""

import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"

import django
from django.conf import settings

if settings.DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":
    raise SystemExit("Configure the PostgreSQL connection before running this check.")
name = "collectflow_review_" + uuid.uuid4().hex
settings.DATABASES["default"].setdefault("TEST", {})["NAME"] = name
settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
    "login_address": "10000/min",
    "login_account": "10000/min",
    "registration": "10000/min",
    "password": "10000/min",
}
django.setup()

from django.test.runner import DiscoverRunner

print(f"Isolated PostgreSQL test database: {name}", flush=True)
raise SystemExit(bool(DiscoverRunner(verbosity=1, interactive=False).run_tests([])))
