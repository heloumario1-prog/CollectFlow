from django.urls import path, include
from rest_framework.routers import DefaultRouter
from payment_promises.views import PaymentPromiseViewSet

router = DefaultRouter()
router.register(r"promises", PaymentPromiseViewSet, basename="promise")

urlpatterns = [
    path("", include(router.urls)),
]
