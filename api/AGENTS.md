# CollectFlow backend agent guide

Scope: `api/` and all of its subdirectories. Read the repository-root `AGENTS.md` for the approved product contract; this file explains the backend that exists and how to extend it. The user's current instruction takes precedence. Where the root guide's **current-state** description is stale, inspect code and migrations rather than repeating it. Never present a target feature as implemented without checking its route, implementation, and tests.

## Start here

- Entry points: `manage.py` loads `config.settings`; `config/urls.py` mounts HTTP routes; `config/asgi.py` and `config/wsgi.py` expose Django.
- Stack: Django + Django REST Framework (DRF), PostgreSQL via Psycopg, Python `>=3.12`, `uv` with `uv.lock`. `api/Dockerfile` uses Python 3.13. The root `compose.yaml` starts PostgreSQL before the API.
- Seven apps: `businesses`, `accounts`, `customers`, `receivables`, `payment_promises`, `payments`, `followups`. Each owns its model and initial migration. There is no shared service/query layer yet.
- `config/settings.py` currently reads PostgreSQL connection variables from the environment (and loads `.env`), sets `AUTH_USER_MODEL = "accounts.User"`, and configures DRF session authentication. It still has a hard-coded secret, `DEBUG=True`, empty `ALLOWED_HOSTS`, no default DRF permission, and suppressed auth checks; these are implementation gaps, not a production configuration.
- `api/README.md` is empty. Use the root guide and the implementation instead of inferring behavior from a README.

## Implemented HTTP path (verify again before editing)

```text
request -> config/urls.py -> app urls.py -> DRF view
        -> permission/authentication -> serializer validation
        -> ORM model(s) -> PostgreSQL -> serializer/Response
```

| Route prefix | Current implementation | Main files |
| --- | --- | --- |
| `/admin/` | Django admin URL is mounted; app `admin.py` files have no model registrations. | `config/urls.py`, `*/admin.py` |
| `/api/v1/auth/` | CSRF cookie, register, login, logout, current user, change password. | `accounts/urls.py`, `accounts/views.py`, `accounts/serializers.py` |
| `/api/v1/business/` | Authenticated read; owner-only partial update. | `businesses/urls.py`, `businesses/views.py`, `businesses/serializers.py` |
| `/api/v1/staff/` | Owner-only list/create/detail/update, deactivate/reactivate, password reset. | `accounts/staff_urls.py`, `accounts/views.py`, `accounts/permissions.py` |

No customer, receivable, promise, payment, follow-up, or dashboard route is mounted. Their `serializers.py` files are empty, their `views.py` files are placeholders, and there are no product tests in the app `tests.py` files. The root guide's planned endpoints, error envelope, pagination, schema, balance services, and idempotency behavior are **targets**, not current capabilities.

### How the implemented layers interact

- `accounts.models.User` extends `AbstractBaseUser`. `UserManager.create_user()` requires a business and role, lowercases email, and hashes passwords with `set_password()`. The database has a `Lower("email")` uniqueness constraint. `role` (`OWNER`/`STAFF`) is the product role; `is_staff` is only for Django admin. The manager has no `create_superuser()` and admin compatibility is incomplete.
- `accounts.serializers` validates registration, login, password changes, and staff requests. Registration nests business and owner input. Its `RegisterSerializer.create()` currently writes both within `transaction.atomic()`; `accounts.views.RegisterView` returns `201` without logging the owner in. `LoginView` calls Django `login()` and returns `UserSerializer`; `LogoutView` calls `logout()`. `ChangePasswordView` calls `update_session_auth_hash()` to keep the current session after a self-change.
- `accounts.permissions.IsOwner` checks the authenticated user's product role. Staff views resolve staff with business and `STAFF` filters, and create staff with the request user's business and a server-assigned role. `businesses.views.BusinessView` reads/updates `request.user.business` and gates updates with `IsOwner`.
- `BusinessSerializer` inherits phone validation from `accounts.serializers.BusinessRegistrationSerializer`. That validator imports `phonenumbers`, but the package is absent from `pyproject.toml` and `uv.lock` as inspected. Resolve this dependency before relying on those routes in a clean environment.
- There is no separate domain service layer yet. Some implemented writes are directly in serializers or views. Put future multi-model transactions and financial calculations into explicit services rather than copying that early pattern across financial apps.

## Database graph and ownership

All seven models have `0001_initial.py` migrations. All current foreign keys use `on_delete=PROTECT`; this prevents referenced rows from being deleted, but does **not** enforce tenant consistency or lifecycle rules.

```text
Business --< User
Business --< Customer --< Receivable --< PaymentPromise --< Payment
Business --< Receivable  (same Receivable row also has a direct business FK)
Customer --< FollowUp   (optional receivable and payment_promise FKs)

Customer, Receivable, PaymentPromise, Payment, and FollowUp also link to
User through their creator/recorder and, where applicable, lifecycle actor FKs.
```

| Model | Stored facts and relationships | Existing database protection / missing rule |
| --- | --- | --- |
| `Business` | Name, phone, fixed USD currency and Beirut timezone choices, active/archive fields. | Phone currently allows `NULL`/blank despite the approved required-phone rule. Exactly one owner is not enforced. |
| `User` | One `business` FK, email normalized by the manager, hashed password, full name, role, active/admin flags. | Case-insensitive email uniqueness exists; there is no conditional one-`OWNER`-per-business constraint. |
| `Customer` | Business, contact/notes, `next_follow_up_on`, creator and archive history. | `(business, phone_e164)` is unique. Database does not enforce creator/archiver's business. |
| `Receivable` | Business, customer, original `DecimalField` amount, USD, dates, stored `status`, creator/archive history. | Positive amount and `due_date >= issue_date` (when issue date exists) checks. Stored status can become stale; cross-business FKs are not checked. |
| `PaymentPromise` | Receivable, amount, promised date, creator and cancellation history. | Positive amount and cancellation-reason checks. `status_for(remaining, today=...)` derives a status using Beirut's date; no shared balance/query implementation exists. |
| `Payment` | Promise, amount/date, `CASH` or `WHISH`, recorder and void history. | Positive amount, method, and void-reason checks. No idempotency record, edit actor, or `updated_at` exists. |
| `FollowUp` | Customer, optional receivable/promise, occurred timestamp, note and creator. | No database check that optional links form the same customer/receivable chain. |

Tenant identity comes only from the authenticated `request.user.business`. For scoped ORM access use `business=...` on users/customers/receivables, `receivable__business=...` on promises, `payment_promise__receivable__business=...` on payments, and `customer__business=...` on follow-ups. Apply the scope in list and detail querysets **before** resolving an ID, including custom actions and related-field choices; a foreign-tenant ID should resolve as not found. The current database schema cannot enforce every cross-table business match, so validate them in application code and cover them with tests.

## Implementing backend changes

1. Read the relevant model, initial and later migrations, serializer, view, URL configuration, tests, and root `AGENTS.md` decision before editing. Check `git status`; preserve unrelated changes.
2. For a model change, add a **new** migration and review it. Never rewrite or delete an applied migration merely to make checks pass. If a change touches custom-user migration history or a populated database, agree on a migration/reset strategy first.
3. For an API change, wire the route in `config/urls.py` and app `urls.py`; use serializers for input validation/output representation, permission classes and business-scoped querysets for authorization, and thin views for HTTP orchestration. Assign business, role, actors, lifecycle fields, balances, and statuses on the server, never from request data.
4. For changes across rows or financial balances, use a reusable service with `transaction.atomic()`. Lock affected receivable/promise rows in a consistent order with `select_for_update()` before validating and writing. Treat original amounts, active promises, and non-voided payments as financial facts; derive balances and date-sensitive statuses consistently for detail, list, filters, and dashboard. Use `Decimal`, not float; use Beirut for business-date decisions while storing timezone-aware datetimes.
5. For lifecycle actions, follow the root contract: no domain `DELETE`; archive/restore customers and receivables, permanently cancel promises, void payments, and keep history. Active payment edits are allowed, but the original `recorded_by` is retained because there is no edit-audit field.
6. Add success, invalid-input, role, foreign-tenant, lifecycle, and concurrency tests as relevant. Test a client-supplied foreign relationship ID as well as a foreign detail URL. Update the OpenAPI schema and error contract when those components are introduced or changed.

The root guide specifies further requirements for registration races, session/CSRF handling, active-user checks, rate limits, one owner, payment idempotency, derived money/status, pagination, errors, and deployment. **Do not assume these are enforced by current code.** Inspect and implement the applicable requirements for each feature.

## Run and validate

From `api/`, with PostgreSQL running and root `.env` populated with usable `POSTGRES_*` values:

```powershell
uv sync --frozen
uv run --no-sync python manage.py check
uv run --no-sync python manage.py makemigrations --check --dry-run
uv run --no-sync python manage.py test
uv run --no-sync black --check .
uv run --no-sync isort --check-only .
```

Use `uv run --no-sync python manage.py runserver` for local development. For a new disposable database, run `uv run --no-sync python manage.py migrate` before starting the server. Do not run migrations against a shared or populated database without reviewing the plan. If a check cannot run because of dependencies or database access, report that limitation accurately; do not call it passing.

## Keep this guide current

Update `api/AGENTS.md` in the **same change** whenever an app/route/service is added, a model or migration changes the relationship graph or invariant, an auth/permission/tenant rule changes, a financial calculation or lifecycle rule changes, or the setup/test/deployment commands change. In particular:

- Move a feature from “target/placeholder” to “implemented” only after its route, code, and tests exist.
- Update the request-path table, model graph, and known gaps from inspected code and migrations; remove resolved gaps instead of accumulating stale history.
- Link detailed contracts from this guide rather than copying large API schemas or the full root product contract.
- Keep examples and commands runnable, avoid secrets and real customer data, and make any mismatch between code and the approved contract explicit.
