from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.contrib.auth import authenticate

import phonenumbers
from rest_framework import serializers

from .models import User
from businesses.models import Business


class BusinessRegistrationSerializer(serializers.ModelSerializer):
    phone_e164 = serializers.CharField(
        required=True,
        allow_blank=False,
        allow_null=False,
        validators=[],
    )

    class Meta:
        model = Business
        fields = [
            "name",
            "phone_e164",
            "base_currency",
            "timezone",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Business name cannot be empty."
            )

        return value

    def validate_phone_e164(self, value):
        value = value.strip()

        try:
            parsed_phone = phonenumbers.parse(value, "LB")
        except phonenumbers.NumberParseException:
            raise serializers.ValidationError(
                "Enter a valid phone number."
            )

        if not phonenumbers.is_valid_number(parsed_phone):
            raise serializers.ValidationError(
                "Enter a valid phone number."
            )

        return phonenumbers.format_number(
            parsed_phone,
            phonenumbers.PhoneNumberFormat.E164,
        )


class OwnerRegistrationSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)

    email = serializers.EmailField()

    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    def validate_full_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Full name cannot be empty."
            )

        return value

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value

    def validate_password(self, value):
        validate_password(value)
        return value


class RegisterSerializer(serializers.Serializer):
    business = BusinessRegistrationSerializer()
    owner = OwnerRegistrationSerializer()

    @transaction.atomic
    def create(self, validated_data):
        business_data = validated_data["business"]
        owner_data = validated_data["owner"]

        business = Business.objects.create(
            **business_data
        )

        user = User.objects.create_user(
            business=business,
            email=owner_data["email"],
            password=owner_data["password"],
            full_name=owner_data["full_name"],
            role=User.Role.OWNER,
        )

        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "business_id"]
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        email = attrs["email"].strip().lower()

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=attrs["password"],
        )

        if user is None:
            raise serializers.ValidationError(
                "Invalid email or password."
            )

        attrs["user"] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    def validate_old_password(self, value):
        user = self.context["request"].user

        if not user.check_password(value):
            raise serializers.ValidationError(
                "Current password is incorrect."
            )

        return value

    def validate_new_password(self, value):
        validate_password(value, user=self.context["request"].user)
        return value

    def validate(self, attrs):
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "New password must be different from the current password."}
            )

        return attrs


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "is_active",
            "created_at",
        ]
        read_only_fields = fields


class StaffCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    def validate_full_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Full name cannot be empty."
            )

        return value

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value

    def validate_password(self, value):
        validate_password(value)
        return value


class StaffUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)

    def validate_full_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Full name cannot be empty."
            )

        return value

    def validate_email(self, value):
        value = value.strip().lower()

        exists = (
            User.objects.filter(email__iexact=value)
            .exclude(pk=self.context["staff_user"].pk)
            .exists()
        )

        if exists:
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value


class StaffResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    def validate_new_password(self, value):
        validate_password(value, user=self.context["staff_user"])
        return value
