from django.urls import path

from .views import (
    StaffDeactivateView,
    StaffDetailView,
    StaffListCreateView,
    StaffReactivateView,
    StaffResetPasswordView,
)


urlpatterns = [
    path("", StaffListCreateView.as_view(), name="staff-list"),
    path("<int:pk>/", StaffDetailView.as_view(), name="staff-detail"),
    path("<int:pk>/deactivate/", StaffDeactivateView.as_view(), name="staff-deactivate"),
    path("<int:pk>/reactivate/", StaffReactivateView.as_view(), name="staff-reactivate"),
    path("<int:pk>/reset-password/", StaffResetPasswordView.as_view(), name="staff-reset-password"),
]
