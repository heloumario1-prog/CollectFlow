from django.urls import path, include
from rest_framework.routers import DefaultRouter
from receivables.views import ReceivableViewSet

router = DefaultRouter()
router.register(r"receivables", ReceivableViewSet, basename="receivable")

urlpatterns = [
    path("", include(router.urls)),
]
