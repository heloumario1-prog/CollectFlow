from django.contrib.auth import login, logout, update_session_auth_hash
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import User
from .permissions import IsOwner

from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    StaffCreateSerializer,
    StaffResetPasswordSerializer,
    StaffSerializer,
    StaffUpdateSerializer,
    UserSerializer,
)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"detail": "CSRF cookie set."})


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(generics.CreateAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "message": "Registration successful.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        login(request, user)

        return Response(UserSerializer(user).data)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])

        update_session_auth_hash(request, user)

        return Response({"message": "Password changed successfully."})


def get_staff_or_404(request, pk):
    # Only STAFF users of the owner's own business can ever be found.
    return get_object_or_404(
        User,
        pk=pk,
        business=request.user.business,
        role=User.Role.STAFF,
    )


class StaffListCreateView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        staff = User.objects.filter(
            business=request.user.business,
            role=User.Role.STAFF,
        ).order_by("full_name", "id")

        return Response(StaffSerializer(staff, many=True).data)

    def post(self, request):
        serializer = StaffCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        staff = User.objects.create_user(
            business=request.user.business,
            email=data["email"],
            password=data["password"],
            full_name=data["full_name"],
            role=User.Role.STAFF,
        )

        return Response(
            StaffSerializer(staff).data,
            status=status.HTTP_201_CREATED,
        )


class StaffDetailView(APIView):
    permission_classes = [IsOwner]

    def get(self, request, pk):
        staff = get_staff_or_404(request, pk)
        return Response(StaffSerializer(staff).data)

    def patch(self, request, pk):
        staff = get_staff_or_404(request, pk)

        serializer = StaffUpdateSerializer(
            data=request.data,
            partial=True,
            context={"staff_user": staff},
        )
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(staff, field, value)

        staff.save()

        return Response(StaffSerializer(staff).data)


class StaffDeactivateView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        staff = get_staff_or_404(request, pk)
        staff.is_active = False
        staff.save(update_fields=["is_active", "updated_at"])

        return Response(StaffSerializer(staff).data)


class StaffReactivateView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        staff = get_staff_or_404(request, pk)
        staff.is_active = True
        staff.save(update_fields=["is_active", "updated_at"])

        return Response(StaffSerializer(staff).data)


class StaffResetPasswordView(APIView):
    permission_classes = [IsOwner]

    def post(self, request, pk):
        staff = get_staff_or_404(request, pk)

        serializer = StaffResetPasswordSerializer(
            data=request.data,
            context={"staff_user": staff},
        )
        serializer.is_valid(raise_exception=True)

        staff.set_password(serializer.validated_data["new_password"])
        staff.save(update_fields=["password", "updated_at"])

        return Response({"message": "Password reset successfully."})
