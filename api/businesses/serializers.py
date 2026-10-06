from accounts.serializers import BusinessRegistrationSerializer


class BusinessSerializer(BusinessRegistrationSerializer):
    class Meta(BusinessRegistrationSerializer.Meta):
        fields = [
            "id",
            "name",
            "phone_e164",
            "base_currency",
            "timezone",
        ]
        read_only_fields = [
            "id",
            "base_currency",
            "timezone",
        ]
