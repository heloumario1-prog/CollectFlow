from django.urls import path, include
from rest_framework.routers import DefaultRouter
from followups.views import FollowUpViewSet

router = DefaultRouter()
router.register(r"followups", FollowUpViewSet, basename="followup")
router.register(r"follow-ups", FollowUpViewSet, basename="follow-up")

urlpatterns = [
    path("", include(router.urls)),
]
