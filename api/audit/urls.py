from django.urls import path
from audit.views import AuditEventListView

urlpatterns = [
    path("audit/", AuditEventListView.as_view(), name="audit-events-list"),
]
