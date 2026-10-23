from rest_framework import permissions


class IsOwnerOnly(permissions.BasePermission):
    """
    Allows access only to authenticated users with role OWNER.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and getattr(request.user, "role", None) == "OWNER"
            and getattr(request.user, "business", None) is not None
            and request.user.business.is_active
        )


class IsBusinessMember(permissions.BasePermission):
    """
    Allows access to authenticated users belonging to an active business.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and getattr(request.user, "business", None) is not None
            and request.user.business.is_active
        )
