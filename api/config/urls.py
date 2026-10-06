from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # Zainab's Auth, Business, and Staff endpoints
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/business/", include("businesses.urls")),
    path("api/v1/staff/", include("accounts.staff_urls")),
    # Collection flow endpoints
    path("api/v1/", include("customers.urls")),
    path("api/v1/", include("receivables.urls")),
    path("api/v1/", include("payment_promises.urls")),
    path("api/v1/", include("payments.urls")),
    path("api/v1/", include("followups.urls")),
    path("api/v1/", include("dashboard.urls")),
    path("api/v1/", include("audit.urls")),
]
