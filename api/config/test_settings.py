"""Isolated tests: never create, migrate, or flush the configured user database."""

from .settings import *  # noqa: F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {
        "login_address": "10000/min",
        "login_account": "10000/min",
        "registration": "10000/min",
        "password": "10000/min",
    },
}
