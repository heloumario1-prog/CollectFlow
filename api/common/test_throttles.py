from types import SimpleNamespace
from uuid import uuid4

from common.throttles import (
    LoginAccountThrottle,
    LoginAddressThrottle,
    PasswordThrottle,
)
from django.test import SimpleTestCase


class AuthenticationThrottleTests(SimpleTestCase):
    def limited(self, parent):
        return type(
            "LimitedThrottle",
            (parent,),
            {"scope": "test_" + uuid4().hex, "rate": "2/min"},
        )()

    def request(self, email="person@example.test", address="127.0.0.1", method="POST"):
        return SimpleNamespace(
            data={"email": email},
            META={"REMOTE_ADDR": address},
            headers={},
            user=SimpleNamespace(pk=17),
            method=method,
        )

    def test_login_address_limit_returns_retry_delay(self):
        throttle = self.limited(LoginAddressThrottle)
        request = self.request()
        self.assertTrue(throttle.allow_request(request, None))
        self.assertTrue(throttle.allow_request(request, None))
        self.assertFalse(throttle.allow_request(request, None))
        self.assertGreater(throttle.wait(), 0)

    def test_account_limit_normalizes_email_across_source_addresses(self):
        throttle = self.limited(LoginAccountThrottle)
        self.assertTrue(throttle.allow_request(self.request(), None))
        self.assertTrue(
            throttle.allow_request(
                self.request(" PERSON@example.test ", "127.0.0.2"), None
            )
        )
        self.assertFalse(
            throttle.allow_request(self.request(address="127.0.0.3"), None)
        )
        self.assertNotIn(
            "person@example.test", throttle.get_cache_key(self.request(), None)
        )

    def test_password_limit_does_not_throttle_staff_list_reads(self):
        throttle = self.limited(PasswordThrottle)
        self.assertIsNone(throttle.get_cache_key(self.request(method="GET"), None))

    def test_malformed_login_payload_does_not_crash_before_validation(self):
        throttle = self.limited(LoginAccountThrottle)
        request = self.request()
        request.data = []
        self.assertTrue(throttle.allow_request(request, None))
