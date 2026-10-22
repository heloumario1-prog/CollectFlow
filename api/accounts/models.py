from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django.db.models.functions import Lower


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The email address is required.")
        if not extra_fields.get("business") and not extra_fields.get("business_id"):
            raise ValueError("The business is required.")
        if not extra_fields.get("role"):
            raise ValueError("The role is required.")

        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        from businesses.models import Business
        extra_fields.setdefault("role", "OWNER")
        extra_fields.setdefault("is_staff", True)
        if not extra_fields.get("business") and not extra_fields.get("business_id"):
            business, _ = Business.objects.get_or_create(
                name="Platform Admin Business",
                defaults={"base_currency": "USD", "timezone": "Asia/Beirut"},
            )
            extra_fields["business"] = business
        return self.create_user(email, password, **extra_fields)



class User(AbstractBaseUser):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        STAFF = "STAFF", "Staff"

    id = models.BigAutoField(primary_key=True)
    business = models.ForeignKey(
        "businesses.Business",
        on_delete=models.PROTECT,
        related_name="users",
    )
    email = models.EmailField(max_length=254, unique=True)
    password = models.CharField(max_length=128, db_column="password_hash")
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=10, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["business", "full_name", "role"]

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                name="accounts_user_email_ci_unique",
            )
        ]

    def clean(self):
        super().clean()
        self.email = self.__class__.objects.normalize_email(self.email).lower()

    def __str__(self):
        return self.email
