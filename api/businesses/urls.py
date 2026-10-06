from django.urls import path

from .views import BusinessView


urlpatterns = [
    path("", BusinessView.as_view(), name="business"),
]
