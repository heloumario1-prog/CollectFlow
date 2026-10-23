import hashlib

from rest_framework.throttling import SimpleRateThrottle


class LoginAddressThrottle(SimpleRateThrottle):
    scope = "login_address"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class LoginAccountThrottle(SimpleRateThrottle):
    scope = "login_account"

    def get_cache_key(self, request, view):
        payload = request.data if isinstance(request.data, dict) else {}
        email = str(payload.get("email", "")).strip().lower()
        identifier = hashlib.sha256(email.encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": identifier}


class RegistrationThrottle(LoginAddressThrottle):
    scope = "registration"


class PasswordThrottle(SimpleRateThrottle):
    scope = "password"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        return self.cache_format % {"scope": self.scope, "ident": request.user.pk}
