# CollectFlow backend agent guide

Scope: `api/` and all of its subdirectories. Read the repository-root `AGENTS.md` for the approved product contract; this file explains the backend that exists and how to extend it. The user's current instruction takes precedence. Where the root guide's **current-state** description is stale, inspect code and migrations rather than repeating it. Never present a target feature as implemented without checking its route, implementation, and tests.

## Current implementation

Read `../docs/project-review.md` and `../docs/api-contract.md` for checked behavior and limitations. All domain routes, dashboard, and owner-only audit listing are mounted. `common/financials.py` supplies batched balance annotations; `common/writes.py` keeps domain validation, save, and audit inside one transaction with a tenant row lock. Related serializer choices are tenant scoped. Domain hard deletes are disabled.

Session/CSRF authentication, atomic registration with duplicate-email race handling, manager-only staff/business writes, active-membership permissions, and cache-based auth throttles are implemented. `config/settings.py` has one DRF configuration with pagination and session authentication. Production settings require explicit environment configuration; local DEBUG settings are not a production deployment.

`payments.0002_paymentrequest` adds durable replay protection for requests carrying `Idempotency-Key`. Keys are scoped to the authenticated business and fingerprints must match. Existing unkeyed consumers remain compatible. The frontend sends keys. This migration creates only a new table; do not reset existing records or authentication migrations.

Run from `api/`:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test --settings=config.test_settings
.\.venv\Scripts\python.exe scripts/test_postgres.py
.\.venv\Scripts\python.exe scripts/check_data.py
```

SQLite tests are isolated in RAM and skip real row-lock tests. The PostgreSQL script requires CREATEDB permission and creates/removes only a newly named test database. `check_data.py` is read-only against configured records. Test data must never come from or modify the user's existing database. Format changed files with Black and isort's `--profile black`.

Database-level exact-one-owner, required-phone, and cross-model tenant constraints still need reviewed migrations. Django-admin/custom-user completeness, generated OpenAPI tooling, shared-cache/edge throttling, and operational deployment checks remain separate gaps; never claim production readiness from passing product tests.

Promise API `KEPT` displays Completed. Payment and promise edits must preserve valid commitments on both balance chains. Cancelled promises and voided payments are immutable; active payments on cancelled promises can be corrected if resulting commitments remain valid. Restore archived customer/receivable chains before new financial activity or voiding.

### Follow-up lifecycle

`/api/v1/followups/` and `/api/v1/follow-ups/` share the same viewset. List/detail/update exclude archived notes and scope to the authenticated business. Authenticated owners and staff of an active business may POST `:id/archive/` (204) or `:id/complete/` (200). The UI labels archive as Delete; HTTP DELETE remains 405. Completion is idempotent. Both actions use explicit transactions, row locking, server-assigned actors/timestamps, and audit events in `followups/services.py`. Completion does not change `Customer.next_follow_up_on` or financial records.

Migration `followups.0002_followup_lifecycle` adds four nullable fields: `archived_at`, `archived_by`, `completed_at`, `completed_by`; existing notes remain visible and pending. No authentication migration or data reset is involved. `completed_at` is read-only in API responses; lifecycle actor fields cannot be supplied by clients. Prefer retaining the additive columns when rolling back application code; reversing this migration discards lifecycle metadata.

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
| `PaymentPromise` | Receivable, amount, promised date, creator and cancellation history. | Positive amount and cancellation-reason checks. `status_for(remaining, today=...)` derives a status using Beirut's date; shared annotations and derived status filters live in `common/financials.py` and the viewsets. |
| `Payment` | Promise, amount/date, `CASH` or `WHISH`, recorder and void history. | Positive amount, method, and void-reason checks. `PaymentRequest` stores durable keyed creation results; the Payment schema has no edit actor or `updated_at`. |
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
uv run --no-sync python manage.py test --settings=config.test_settings
uv run --no-sync black --check .
uv run --no-sync isort --profile black --check-only .
```

Use `uv run --no-sync python manage.py runserver` for local development. For a new disposable database, run `uv run --no-sync python manage.py migrate` before starting the server. Do not run migrations against a shared or populated database without reviewing the plan. If a check cannot run because of dependencies or database access, report that limitation accurately; do not call it passing.

## Keep this guide current

Update `api/AGENTS.md` in the **same change** whenever an app/route/service is added, a model or migration changes the relationship graph or invariant, an auth/permission/tenant rule changes, a financial calculation or lifecycle rule changes, or the setup/test/deployment commands change. In particular:

- Move a feature from “target/placeholder” to “implemented” only after its route, code, and tests exist.
- Update the request-path table, model graph, and known gaps from inspected code and migrations; remove resolved gaps instead of accumulating stale history.
- Link detailed contracts from this guide rather than copying large API schemas or the full root product contract.
- Keep examples and commands runnable, avoid secrets and real customer data, and make any mismatch between code and the approved contract explicit.
