# CollectFlow Agent Guide

## Read this first

CollectFlow is a multi-tenant receivables-management application for Lebanese small businesses and suppliers that sell to customers on credit. It replaces scattered WhatsApp messages, notebooks, and spreadsheets with one record of customers, receivables, payment promises, payments, and collection follow-ups.

This file is both a repository guide and the approved MVP contract. The repository is still a skeleton: most behavior described as **target** below is not implemented.

Use this authority order when information conflicts:

1. The user's current, explicit instruction.
2. The approved product decisions in this file.
3. The code and migrations for facts about what exists today.
4. The root and package README files, which contain incomplete or stale setup and template text.

Never describe target behavior as implemented without inspecting and testing it.

## Approved product decisions

These decisions are not open to reinterpretation during implementation:

- A business has exactly one manager. The database role is `OWNER`; the interface calls that user the manager.
- A user account belongs to exactly one business.
- Email addresses are globally unique, case-insensitively. If an owner email already exists, registration returns a clear validation error and creates no business. A person managing another business needs another account and email.
- Registration submits business and owner data together and creates both in one database transaction.
- Registration never starts a login session. Success sends the owner to the login screen.
- Business phone is required and stored in E.164 format.
- Only the owner can create, deactivate, reactivate, or reset the password of staff members.
- The owner creates staff with an initial password and communicates it outside CollectFlow through a secure channel. There are no invitations or staff self-registration. The MVP does not force a password change on first login; treat that as an explicit security tradeoff rather than implying the password is temporary.
- Staff accounts always belong to the authenticated owner's business and always have the `STAFF` role.
- Owners and staff can perform daily collection work. Only owners can manage staff and business settings.
- USD is the only MVP currency. Business dates use `Asia/Beirut`; stored datetimes remain timezone-aware.
- The interface is English and left-to-right.
- WhatsApp is manual through a `wa.me` link. CollectFlow does not send or synchronize messages.
- Domain and financial records are never hard-deleted through the API. Use deactivate, archive, cancel, or void operations.
- Direct edits to active payments remain allowed. The current schema does not record who edited a payment; this is an accepted MVP limitation, not an audit feature.

If a requested change contradicts one of these decisions, point out the conflict before implementing it.

## Current repository state

The current code is a project skeleton, not a working product.

### Backend today

- `api/` contains Django, Django REST Framework, and seven domain apps.
- Each domain model and its initial migration exist.
- Every application `serializers.py` is empty.
- Every application `views.py` and `admin.py` is still a placeholder.
- `api/config/urls.py` exposes only Django admin.
- Test files contain no product tests.
- `accounts.User` exists, but `AUTH_USER_MODEL` is not configured. Django therefore still treats its built-in user model as authoritative.
- `accounts.UserManager` has no `create_superuser`, and the custom user does not yet provide complete Django-admin permission behavior.
- `Business.phone_e164` is currently nullable and blank, contrary to the approved target.
- The schema does not enforce one `OWNER` per business.
- `Receivable.status` is stored, while the target statuses depend on live balances and dates. It must not become a second, stale source of truth.
- Cross-model business consistency is not enforced by the database. For example, a receivable can currently be assigned a customer or creator from another business unless application code prevents it.
- Settings currently contain a hard-coded secret, `DEBUG=True`, empty `ALLOWED_HOSTS`, no DRF defaults, and no CORS or CSRF-origin configuration. Do not treat them as production-ready.

Configuring `AUTH_USER_MODEL` is an early architectural blocker, not a routine late change. Do not apply or rewrite authentication migrations against a populated database without first agreeing on a migration or development-database reset strategy.

### Frontend today

- `frontend/` is a React 19, React Router 8, TypeScript, Vite, and Tailwind CSS starter.
- It contains one sample route demonstrating a loader, action, and form.
- There is no API client, authentication state, CSRF handling, protected routing, product screen, or frontend test setup.
- `frontend/vite.config.ts` has no development `/api` proxy.
- `frontend/nginx.conf` serves the SPA but does not proxy `/api` to Django.
- `frontend/package.json` has `dev`, `build`, `preview`, and `typecheck` scripts; it has no `test` or `lint` script.
- `frontend/README.md` is upstream template text and incorrectly discusses an SSR server. The current Docker image builds a static SPA and serves `dist/` with Nginx.

## Repository map

| Path | Responsibility |
| --- | --- |
| `api/config/` | Django settings, root URLs, WSGI, and ASGI |
| `api/businesses/` | Business identity, phone, fixed currency/timezone, and lifecycle |
| `api/accounts/` | Owner/staff authentication, roles, activity, and business membership |
| `api/customers/` | Customer contact details, notes, next follow-up date, and archive history |
| `api/receivables/` | Debt principal, dates, reference data, derived balance/status, and archive history |
| `api/payment_promises/` | Promised installments, derived balance/status, and cancellation history |
| `api/payments/` | Cash or Whish payments and immutable void history |
| `api/followups/` | Timestamped notes linked to a customer and optionally a receivable/promise |
| `frontend/src/main.tsx` | Current React Router definition |
| `frontend/src/routes/` | Route components, loaders, actions, and error boundaries |
| `frontend/src/styles.css` | Current global styles |
| `compose.yaml` | PostgreSQL, API, and production-built frontend containers |
| `docs/CollectFlow_End_to_End_Workflow.docx` | Team discussion copy of the approved workflow |

## Data model and tenant boundaries

```text
Business
|- User [direct business FK; exactly one OWNER, optional STAFF]
|- Customer [direct business FK]
|  `- Receivable [also has direct business FK]
|     `- PaymentPromise [tenant inherited through receivable]
|        `- Payment [tenant inherited through promise -> receivable]
`- FollowUp [tenant inherited through customer]
   |- optional Receivable from the same customer and business
   `- optional PaymentPromise from that same receivable chain
```

All current foreign keys use `PROTECT`, but that alone does not provide tenant isolation or lifecycle rules.

### Required relationship invariants

- `User.business` is the only business membership for an authenticated account.
- `Customer.business` and `Customer.created_by.business` must match. The same applies to `archived_by` when present.
- `Receivable.business`, `Receivable.customer.business`, and every actor's business must match.
- A promise's tenant is `promise.receivable.business`; its creator must belong to that business.
- A payment's tenant is `payment.payment_promise.receivable.business`; `recorded_by` and `voided_by` must belong to it.
- A follow-up's tenant is `followup.customer.business`. Its optional receivable must belong to that customer. Its optional promise must belong to that receivable; when no receivable is supplied directly, the promise's receivable must still belong to the same customer.
- Actor and ownership fields are always assigned by server code, never accepted from the client.

### Exact-one-owner rule

The existing schema does not enforce this rule. The target implementation needs all of the following:

- Registration creates the business and its owner atomically, establishing at least one owner.
- Add a conditional database constraint equivalent to `UniqueConstraint(fields=["business"], condition=Q(role="OWNER"), name="one_owner_per_business")`. This enforces at most one owner; registration and lifecycle rules establish and preserve at least one.
- Staff endpoints cannot create or promote an owner.
- Owner accounts are not managed through staff deactivate/reactivate operations.
- No supported lifecycle operation can leave a business without its owner.

Do not use Django's `is_staff` field to represent the CollectFlow `STAFF` role. `role` controls product permissions; `is_staff` is reserved for Django admin access.

## Registration and authentication

`POST /api/v1/auth/register/` is the only public operation that may create a business or an `OWNER`.

The registration service must:

1. Validate and normalize the entire payload, including required business phone and normalized lowercase email.
2. Run Django's configured password validators before opening the transaction.
3. Check for an existing normalized email to provide an early, friendly validation error, while keeping the case-insensitive database constraint authoritative.
4. Start `transaction.atomic()`.
5. Create the business.
6. Create the linked owner through the user manager so the password is hashed, with `role=OWNER` assigned by the server.
7. Commit only if both records succeed; otherwise roll back both.
8. Catch a unique-email `IntegrityError` outside the failed atomic block and translate the concurrent-registration race into the same safe validation response. Never expose database exception text.
9. Return `201 Created` without calling `login()` or creating an authenticated session.

Use Django session authentication and CSRF protection. Login uses the case-normalized email and password. After authentication, derive tenant scope exclusively from `request.user.business`; never accept a client-provided business ID as authorization.

### Owner and staff login flow

- Owners and staff use the same `/login` screen and `POST /api/v1/auth/login/` endpoint. There is no separate staff authentication system.
- Authentication verifies normalized email, password, and `is_active`. Return one generic invalid-credentials response for unknown email, wrong password, and inactive account to reduce account enumeration.
- On success, use Django's `login()` so the session identifier and CSRF token are rotated. The response returns the current user's safe profile, role, and permitted business context, never a password or password hash.
- Every authenticated request checks that the user remains active. A deactivated staff member must lose access on the next request; cover existing-session behavior in an integration test.
- Authorization comes from `request.user.role`. Owners and staff share daily collection endpoints, while staff receive `403 Forbidden` from staff-management and business-settings endpoints.
- Logout is a CSRF-protected `POST` that calls Django's `logout()` and flushes the session. Do not implement logout as `GET`.
- The owner resets a staff password through the owner-only staff endpoint. Password reset uses the same validators and `set_password()` and must invalidate the staff member's existing authenticated sessions.

### Password and login security

- Run Django password validators for owner registration, staff creation, password change, and owner-initiated staff reset. Do not rely only on a serializer length check.
- Always use `set_password()` or the user manager. Never store, return, log, email, or persist plaintext passwords.
- Apply rate limits to login, registration, and password-sensitive endpoints at both the application and edge/proxy layers. Limits should consider account and source address without permanently locking out a legitimate user.
- Do not reveal whether an email exists through login errors. The registration duplicate-email error is intentionally explicit because the approved registration workflow requires it.
- Password changes and resets revoke existing sessions by relying on Django's session-auth hash behavior and by testing the result. Rotate the current session only when the user changes their own password and the product intentionally keeps that session signed in.
- Record security-relevant events such as login success/failure, staff activation changes, and password resets without recording credentials, session IDs, CSRF tokens, customer notes, or unnecessary personal data.

Planned authentication endpoints:

- `GET /api/v1/auth/csrf/`
- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/logout/`
- `GET /api/v1/auth/me/`
- `POST /api/v1/auth/change-password/`

## Authorization and query scoping

Every list, detail, update, filter, dashboard query, and custom action must start from a business-scoped queryset. Filtering only after fetching an object is not acceptable.

Use these tenant paths:

| Resource | Tenant filter |
| --- | --- |
| User/staff | `business=request.user.business` |
| Customer | `business=request.user.business` |
| Receivable | `business=request.user.business` |
| Payment promise | `receivable__business=request.user.business` |
| Payment | `payment_promise__receivable__business=request.user.business` |
| Follow-up | `customer__business=request.user.business` |

A valid identifier from another business should behave as not found. Apply the same scope to relationship-choice querysets so a user cannot submit a foreign customer, receivable, promise, or actor ID.

Clients cannot set or override:

- `business`
- `role`
- `created_by` / `recorded_by`
- `archived_by` / `cancelled_by` / `voided_by`
- lifecycle timestamps
- calculated balances or statuses

## Financial source of truth

Use `Decimal` for money and serialize API amounts as decimal strings. Never use binary floating point for balances.

The authoritative financial facts are the original receivable amount, promise amounts and lifecycle state, and non-voided payments. Balances and statuses are derived from those facts.

### Receivable calculations

```text
paid_amount = sum(non-voided payments across every promise, including payments on later-cancelled promises)
remaining_amount = original_amount - paid_amount
active_promised_remaining = sum(unpaid portions of non-cancelled promises)
unpromised_amount = remaining_amount - active_promised_remaining
```

Receivable status precedence:

1. `PAID` when `remaining_amount == 0`.
2. `OVERDUE` when unpaid and `due_date` is before today in Beirut.
3. `PARTIALLY_PAID` when unpaid and `paid_amount > 0`.
4. `OPEN` otherwise.

`Receivable.status` currently exists as a database column. Do not accept it from API clients or read it as an independent truth. Either calculate it on reads or update it transactionally from one shared calculation service; whichever approach the team adopts must be used consistently by serializers, filters, dashboards, and tests.

### Promise calculations

```text
paid_amount = sum(non-voided payments for the promise)
remaining_amount = promise.amount - paid_amount
```

Promise status precedence:

1. `CANCELLED` when `cancelled_at` is set.
2. `KEPT` when `remaining_amount == 0`.
3. `BROKEN` when unpaid and `promised_on` is before today in Beirut.
4. `PENDING` otherwise.

The model currently has a `status_for()` helper, but no shared query/filter implementation. Avoid duplicating slightly different status logic across layers.

### Validation and lifecycle rules

- Amounts must be positive and use no more than two decimal places.
- Active promised remaining amounts cannot exceed the receivable's unpaid balance.
- Non-voided payments cannot exceed the selected promise's remaining amount.
- Payments cannot be created for cancelled or fully paid promises.
- A partially paid promise may be cancelled. Its existing non-voided payments still count toward the receivable.
- Active receivables and promises may be edited only when resulting balances stay valid.
- An active payment may change promise, amount, date, method, and note if both the old and new promise/receivable balances remain valid.
- The payment's original `recorded_by` remains unchanged on edit. The schema has neither `updated_by` nor `updated_at` for payments.
- Cancelled promises and voided payments are immutable.
- Creating a follow-up may atomically set or clear `Customer.next_follow_up_on`.
- Archived customers and receivables cannot receive new activity.
- A receivable may be archived only when fully paid or when it has no promises or payments.
- A customer may be archived only when it has no active unpaid receivables.
- Customer and receivable archives may be restored.
- Promise cancellation and payment voiding are permanent and require their history fields; they are not restore operations.

Balance-sensitive promise and payment mutations require `transaction.atomic()` plus `select_for_update()`. Lock the affected receivable and promise rows in a consistent order. A payment moved between promises may affect two balance chains; lock and validate both before saving. Application validation without row locks is not sufficient for concurrent requests.

## Planned API

No product API endpoint is implemented yet. The target is a versioned, flat API under `/api/v1/`.

| Area | Target behavior |
| --- | --- |
| `/auth/` | CSRF, registration, login, logout, current user, password change |
| `/business/` | Authenticated read; owner-only update; no standalone create |
| `/staff/` | Owner-only list/create/update plus deactivate, reactivate, and reset-password actions |
| `/customers/` | List/create/retrieve/update plus archive and restore actions |
| `/receivables/` | List/create/retrieve/update plus archive and restore actions |
| `/promises/` | List/create/retrieve/update plus permanent cancel action |
| `/payments/` | List/create/retrieve/update plus permanent void action |
| `/follow-ups/` | List/create/retrieve/update |
| `/dashboard/` | Summary for today, this week, this month, or a custom range |

Use page-number pagination with 25 records by default. Add resource-appropriate search, status, lifecycle, relationship, date, due-date, method, and ordering filters. Return dates as `YYYY-MM-DD`, timezone-aware datetimes as ISO 8601 values, and money as strings.

All unsupported `DELETE` requests for domain data return `405 Method Not Allowed`; they do not silently archive or void records.

Keep multi-model transactions and balance rules in explicit domain/service functions. Serializers own representation and request validation; views own HTTP orchestration and permissions. Do not scatter financial rules across all three layers.

### API reliability and contract

- Publish and maintain an OpenAPI schema for implemented endpoints. The schema, serializers, and tests must agree on required fields, response fields, status codes, filters, pagination, and error shapes.
- Use one documented JSON error envelope for validation, authentication, permission, conflict, throttling, and unexpected errors. Do not leak stack traces, SQL, internal paths, or raw exception messages.
- Payment creation requires a client-generated idempotency key persisted with a request fingerprint and result in the same database transaction as the payment. Scope uniqueness to the authenticated business and operation.
- Repeating the same idempotency key with the same payload returns the original outcome without creating another payment. Reusing it with a different payload returns `409 Conflict`.
- Do not use an in-memory cache alone for financial idempotency; it must survive process restarts and concurrent workers.
- Use `400` for malformed/validation input, `401` for unauthenticated requests, `403` for authenticated users lacking a role permission, `404` for missing or foreign-tenant resources, `409` for state/idempotency conflicts, and `429` for throttling.
- Validate pagination and ordering parameters, cap page size, and allow ordering only by explicitly approved fields.

## Planned frontend screens

| Route | Purpose |
| --- | --- |
| `/register` | Two-section business + owner form submitted as one transaction |
| `/login` | Email/password login after registration |
| `/` | Dashboard, defaulting to the current month |
| `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/edit` | Customer list, creation, detail/history, and editing |
| `/receivables`, `/receivables/new`, `/receivables/:id`, `/receivables/:id/edit` | Receivable workflows |
| `/promises`, `/promises/new`, `/promises/:id`, `/promises/:id/edit` | Promise workflows |
| `/payments`, `/payments/new`, `/payments/:id/edit` | Payment history, filters, recording, and active edits |
| `/follow-ups`, `/follow-ups/new` | Due follow-ups, history, WhatsApp launch, and note recording |
| `/staff` | Owner-only staff management |
| `/settings/business` | Owner-only business settings |
| `/settings/profile` | Current-user information and password change |

The dashboard supports today, this week, this month, and custom date periods. It shows:

- total outstanding balance
- total overdue balance
- Cash collected
- Whish collected
- total collected
- total unpromised balance
- broken promises
- promises due within seven days
- customers whose follow-up date is due

The frontend needs one credentialed API client, CSRF headers on unsafe requests, protected route loaders, role-aware navigation, consistent API error handling, and route/data revalidation after mutations. The backend remains authoritative for permissions and financial calculations; hiding a button is not authorization.

## How the services connect

### Local development

The Vite development server runs on port 5173 and Django runs on port 8000. The current Vite config does not connect them. Implement either a Vite `/api` proxy or a complete credentialed CORS/CSRF configuration before session authentication can work reliably across those origins. Prefer one documented approach rather than mixing both.

### Target deployed request path

```text
Browser
  -> Nginx serves the React SPA
  -> Nginx proxies /api/ to Django
  -> DRF validates session, CSRF, role, tenant, and business rules
  -> Django reads/writes PostgreSQL

Browser
  -> wa.me for manual WhatsApp navigation only
```

Only Django accesses PostgreSQL. The frontend never writes the database directly and never supplies authoritative balances, statuses, tenant IDs, roles, or audit actors.

The current Nginx file lacks the `/api` proxy, so this production path is target work.

### Production security baseline

- Read `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, database credentials, and trusted origins from environment-specific configuration. Fail startup when required production values are missing.
- Terminate HTTPS at the trusted edge and configure Django's proxy SSL header only for a proxy that strips and sets it correctly. Enable secure redirects and HSTS after HTTPS is verified end to end.
- Production session cookies must be `Secure`, `HttpOnly`, and appropriately `SameSite`; CSRF cookies must be `Secure`. Keep a narrow `CSRF_TRUSTED_ORIGINS` and CORS allowlist—never wildcard credentialed origins.
- If the SPA and API are served through the same Nginx origin, prefer same-origin `/api/` requests. The browser client still uses credentials and sends the CSRF token on unsafe methods.
- Set security headers through Django/Nginx, including frame, MIME-sniffing, referrer, and a tested Content Security Policy. Do not weaken CSRF protection to solve development proxy problems.
- Pin production dependencies through the committed lockfiles and review automated dependency/security scan findings before release.

### Operations and observability

- Provide separate liveness and readiness checks. Readiness verifies required dependencies without exposing credentials or internal details.
- Emit structured logs with timestamp, severity, request/correlation ID, route, status, duration, and safe actor/business identifiers. Never log passwords, hashes, cookies, CSRF tokens, authorization headers, or full sensitive request bodies.
- Return a request ID in error responses so support can correlate a user-visible failure with server logs.
- Monitor error rate, latency, failed logins, throttling, database health, and failed background/maintenance operations. Alerts need an owner and a response procedure.
- Back up PostgreSQL on a documented schedule, encrypt backups, restrict access, define retention, and perform periodic restore tests. An untested backup is not considered recoverable.
- Document migration, rollback, and release procedures. Take a verified backup before high-risk production data migrations and avoid destructive schema changes without a staged plan.
- Keep development seed data separate from production and never copy real customer data into local or test environments without approved anonymization.

## Technology stack

- Python `>=3.12`; the API Docker image currently uses Python 3.13
- Django 6.1.1 and Django REST Framework 3.18.1 from `api/uv.lock`
- PostgreSQL 17 with Psycopg 3
- uv for Python dependencies and environments
- React 19, React Router 8, and TypeScript 5.9
- Vite 8 and Tailwind CSS 4
- Nginx for the built frontend container
- Docker Compose for local multi-service orchestration

## Setup, run, and validation commands

### Docker workflow

From the repository root:

```powershell
Copy-Item .env.example .env
# Replace the example database password in .env.
docker compose build
docker compose up -d db
docker compose run --rm api uv run --no-sync python manage.py migrate
docker compose up api frontend
```

The API is exposed at `http://localhost:8000` and the Nginx-served frontend at `http://localhost:5173` by default. For the target authentication implementation, resolve `AUTH_USER_MODEL` before initializing a shared or persistent development database.

### Local API workflow

PostgreSQL must be running and the root `.env` must contain usable connection values.

```powershell
Set-Location api
uv sync --frozen
uv run --no-sync python manage.py migrate
uv run --no-sync python manage.py runserver
```

### Local frontend workflow

```powershell
Set-Location frontend
npm ci
npm run dev
```

### Validation

```powershell
Set-Location api
uv run --no-sync python manage.py check
uv run --no-sync python manage.py makemigrations --check --dry-run
uv run --no-sync python manage.py test
uv run --no-sync black --check .
uv run --no-sync isort --check-only .

Set-Location ../frontend
npm run typecheck
npm run build
```

There is currently no frontend test or lint command. Add the tool and package script before documenting one.

### Continuous integration baseline

CI should run on every pull request and protected-branch update using a disposable PostgreSQL database. It must install from lockfiles and run:

- migration consistency checks
- backend formatting/import checks and the complete backend test suite
- frontend type checking, linting, tests, and production build once those scripts exist
- dependency and secret scanning
- OpenAPI schema validation and compatibility checks once the API contract exists

Do not merge by bypassing a failed required check. Flaky tests must be fixed or explicitly quarantined with an owner and follow-up date; repeatedly rerunning them is not a solution.

## Recommended implementation order

1. Fix the authentication foundation: custom-user settings/manager/admin compatibility, exact-one-owner protection, required business phone, environment-driven settings, and a safe migration strategy.
2. Add API-wide authentication, CSRF, permission, tenant-queryset, error, pagination, and routing foundations.
3. Implement registration and owner-only staff/business flows with transaction tests.
4. Implement shared balance/status queries and locked domain services for customers, receivables, promises, payments, and follow-ups.
5. Expose the resource endpoints and dashboard with tenant-isolation and concurrency tests.
6. Add the credentialed frontend API layer, auth shell, role-aware navigation, then feature screens in journey order.
7. Add responsive end-to-end coverage for registration through final collection, and finish the Nginx/API deployment path.

## Testing expectations

Every business-rule change needs success, validation, permission, and cross-tenant tests as applicable. At minimum cover:

- atomic registration and rollback
- duplicate normalized email rejection with no orphaned business
- concurrent duplicate registration translated into the same safe validation response
- required/normalized business phone
- no session after registration and successful later login
- shared owner/staff login behavior, generic credential failures, and login throttling
- password validation on registration, staff creation, change, and reset
- session/CSRF rotation on login, CSRF-protected logout, and production cookie settings
- immediate denial of an inactive staff member's existing session
- exactly one owner and owner-only staff/settings operations
- server-assigned staff business and `STAFF` role
- cross-business denial for lists, detail routes, filters, relationship IDs, and custom actions
- customer phone uniqueness within a business
- receivable, promise, unpromised, and status calculations
- payment create, edit, move, and void recalculation
- repeated and concurrent payment requests with the same idempotency key
- conflicting reuse of an idempotency key with a different payload
- overpayment and over-promising, including concurrent attempts
- Beirut date boundaries for overdue and broken statuses
- follow-up customer/receivable/promise chain consistency
- archive blockers, restoration, and immutable cancellation/void history
- dashboard date ranges and totals
- complete owner and staff journeys at mobile and desktop sizes

## Definition of done

A change is complete only when:

- behavior matches the approved decisions and implemented API contract
- permissions and tenant scoping are enforced on the backend, including related-object inputs
- database constraints and transaction/locking behavior protect the same invariants under concurrency
- success, validation, permission, cross-tenant, lifecycle, and concurrency tests are added as relevant
- schema migrations are reviewed and migration checks pass
- API schema and human documentation are updated when the contract changes
- relevant backend and frontend validation commands pass in CI
- logs and errors contain enough context to diagnose failures without exposing secrets or sensitive data
- deployment, rollback, monitoring, or backup implications are documented for operational changes

## Working rules for agents

- Inspect this file plus the relevant models, migrations, settings, URLs, and package scripts before editing.
- Preserve unrelated user changes; assume the working tree may already be dirty.
- Never revert, delete, or regenerate migration history merely to make checks pass. Confirm the database/migration strategy first.
- Do not commit `.env`, secrets, virtual environments, `node_modules`, build output, or Python cache files.
- Keep model changes and migrations synchronized.
- Start every domain queryset from the authenticated business and scope all related-field choices too.
- Treat `role`, not Django `is_staff`, as the product role.
- Never accept ownership, actor, lifecycle, balance, or status fields from clients.
- Never log or expose credentials, password hashes, session or CSRF tokens, secrets, or unneeded sensitive request bodies.
- Keep views thin and centralize multi-model transactions and calculations in reusable services/query helpers.
- Avoid signals for core financial workflows; make transaction boundaries explicit and testable.
- Use `select_related`, `prefetch_related`, and aggregate queries deliberately; do not introduce per-row balance queries on list/dashboard endpoints.
- Add or update tests with every behavior change and run the relevant validation commands.
- Keep the OpenAPI schema and error contract synchronized with implemented endpoints.
- Treat production security settings, database backups, idempotency, and observability as application requirements, not deployment afterthoughts.
- Update this guide when the user approves a change to architecture or business rules.
- Never silently change the one-owner, one-business-per-account model.
