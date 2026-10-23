from businesses.models import Business
from django.db import transaction
from rest_framework import serializers


class BusinessWriteLockMixin:
    """Serialize domain writes per tenant through validation, saving and audit.

    This deliberately favors correctness over concurrent writes within one small
    business. Existing receivable/promise locks remain inside this outer lock.
    Reads and writes for different businesses do not share this lock.
    """

    def dispatch(self, request, *args, **kwargs):
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            with transaction.atomic():
                return super().dispatch(request, *args, **kwargs)
        return super().dispatch(request, *args, **kwargs)

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        for name in ("customer", "receivable", "payment_promise"):
            if name in request.query_params:
                serializers.IntegerField(min_value=1).run_validation(
                    request.query_params[name]
                )
        for name, value in request.query_params.items():
            if name.endswith(("_from", "_to")):
                serializers.DateField().run_validation(value)
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            Business.objects.select_for_update().get(pk=request.user.business_id)
