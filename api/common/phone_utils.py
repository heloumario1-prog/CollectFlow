import re
from rest_framework.exceptions import ValidationError

try:
    import phonenumbers
except ImportError:
    phonenumbers = None


def normalize_phone_number(raw_phone: str, country_code: str = "LB") -> str:
    """
    Validates and normalizes phone number to canonical E.164 format (+96170123456).
    Uses phonenumbers library with Lebanese default ('LB').
    """
    if not raw_phone:
        raise ValidationError({"phone": "Phone number is required."})

    cleaned = str(raw_phone).strip()
    country = (country_code or "LB").upper()

    if phonenumbers is not None:
        try:
            parsed = phonenumbers.parse(cleaned, country)
            if not phonenumbers.is_valid_number(parsed):
                raise ValidationError(
                    {"phone": f"The phone number is not valid for country '{country}'."}
                )
            e164 = phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            )
            return e164
        except phonenumbers.NumberParseException as e:
            raise ValidationError({"phone": f"Invalid phone format: {str(e)}"})

    # Fallback if phonenumbers library is unavailable
    digits_only = re.sub(r"[^\d+]", "", cleaned)
    if digits_only.startswith("+"):
        e164 = digits_only
    elif country == "LB":
        digits_only = digits_only.lstrip("0")
        e164 = f"+961{digits_only}"
    else:
        e164 = f"+{digits_only}"

    if not re.match(r"^\+[1-9]\d{6,14}$", e164):
        raise ValidationError({"phone": "Invalid E.164 phone number."})
    return e164


def get_whatsapp_url(phone_e164: str) -> str:
    """
    Produces WhatsApp URL without '+' and spaces.
    Example: +96170123456 -> https://wa.me/96170123456
    """
    if not phone_e164:
        return ""
    digits = re.sub(r"\D", "", phone_e164)
    return f"https://wa.me/{digits}"
