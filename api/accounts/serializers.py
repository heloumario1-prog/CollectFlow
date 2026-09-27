from django.contrib.auth.password_validation import validate_password
from django.db import transaction

import phonenumbers
from rest_framework import serializers

from .models import User
from businesses.models import Business


class BusinessRegistrationSerializer(serializers.ModelSerializer):
    phone_e164 = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
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
        if not value:
            return value

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