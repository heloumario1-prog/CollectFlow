from rest_framework.permissions import BasePermission

from .models import User


class IsOwner(BasePermission):
    message = "Only the business owner can do this."

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.business.is_active
            and user.role == User.Role.OWNER
        )
