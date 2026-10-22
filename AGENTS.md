# CollectFlow Agent Guide

## Read this first

CollectFlow is a multi-tenant receivables-management application for Lebanese small businesses and suppliers that sell to customers on credit. It replaces scattered WhatsApp messages, notebooks, and spreadsheets with one record of customers, receivables, payment promises, payments, and collection follow-ups.

This file states repository-wide product decisions and routes to the detailed MVP contract in `docs/mvp-contract.md`. Auth, business, and staff API routes exist, and the frontend contains in-memory screen prototypes. Most financial and integration behavior below remains **target** work. For task-specific implementation details, use `api/AGENTS.md` when working under `api/` and `frontend/AGENTS.md` when working under `frontend/`; inspect only the files relevant to the task.

Use this authority order when information conflicts:

1. The user's current, explicit instruction.
2. The approved product decisions here and the relevant requirements in `docs/mvp-contract.md`.
3. The code, migrations, and package scripts for facts about what exists today.
4. The root and package README files, which may contain incomplete or stale setup text.

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

The current code has partial auth and business APIs plus disconnected frontend prototypes. It is not a working end-to-end product.

### Backend today

- `api/` contains Django, Django REST Framework, and seven domain apps.
- Each domain model and its initial migration exist. Auth, staff, and business serializers/views have been added; customer, receivable, promise, payment, and follow-up serializers/views remain placeholders.
- `api/config/urls.py` mounts Django admin and `/api/v1/auth/`, `/api/v1/business/`, and `/api/v1/staff/`. The other product API areas are not mounted.
- Test files contain no product tests, so implemented routes are not yet verified by a product suite.
- `AUTH_USER_MODEL = "accounts.User"` and DRF session authentication are configured. `accounts.UserManager` still has no `create_superuser`, and Django-admin permission behavior is incomplete.
- Registration creates a business and owner atomically in a serializer; login, logout, current-user, password-change, owner-only staff, and business endpoints have view implementations. Do not infer that every target security rule below is met: the error envelope, rate limits, one-owner constraint, registration race handling, and active-user/session behavior still need verification or implementation.
- The phone serializer imports `phonenumbers`, but it is not declared in `api/pyproject.toml` or the lockfile; clean installs cannot rely on these API routes until the dependency is added.
- `Business.phone_e164` is currently nullable and blank, contrary to the approved target.
- The schema does not enforce one `OWNER` per business.
- `Receivable.status` is stored, while the target statuses depend on live balances and dates. It must not become a second, stale source of truth.
- Cross-model business consistency is not enforced by the database. For example, a receivable can currently be assigned a customer or creator from another business unless application code prevents it.
- Settings still contain a hard-coded secret, `DEBUG=True`, empty `ALLOWED_HOSTS`, no default DRF permission, and no CORS or CSRF-origin configuration. `SILENCED_SYSTEM_CHECKS` suppresses auth checks. Do not treat the settings as production-ready.

The custom user setting now exists, but its migration history still needs deliberate handling. Do not apply or rewrite authentication migrations against a populated database without first agreeing on a migration or development-database reset strategy.

### Frontend today

- `frontend/` uses React 19, React Router 8 Data Mode, TypeScript, Vite, and Tailwind CSS.
- `src/main.tsx` registers several product-shaped routes; most screens read or mutate in-memory `src/data/` modules. Dashboard loader/action exports are placeholders. Login and registration do not call Django. These screens are disposable UI prototypes, not examples for connected features.
- There is no credentialed API client, CSRF handling, protected routing, or frontend test setup.
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
| `api/AGENTS.md` | Backend implementation status and task-specific guidance |
| `frontend/src/main.tsx` | Current React Router definition |
| `frontend/src/routes/`, `frontend/src/data/` | Current prototype screens and in-memory data |
| `frontend/AGENTS.md` | Target frontend route, feature, service, and type structure |
| `frontend/src/styles.css` | Current global styles |
| `compose.yaml` | PostgreSQL, API, and production-built frontend containers |
| `docs/mvp-contract.md` | Detailed approved domain, API, integration, and testing requirements |
| `docs/CollectFlow_End_to_End_Workflow.docx` | Team discussion copy of the approved workflow |

## Detailed MVP contract

The approved details live in `docs/mvp-contract.md`. Read the relevant section when changing that behavior:

- [Data model and tenant boundaries](docs/mvp-contract.md#data-model-and-tenant-boundaries): relationship and exact-one-owner invariants.
- [Registration and authentication](docs/mvp-contract.md#registration-and-authentication) and [authorization and query scoping](docs/mvp-contract.md#authorization-and-query-scoping): account, session, CSRF, role, and tenant behavior.
- [Financial source of truth](docs/mvp-contract.md#financial-source-of-truth): balances, statuses, lifecycle rules, and concurrency.
- [API target and current route status](docs/mvp-contract.md#api-target-and-current-route-status): endpoint coverage, pagination, errors, and idempotency.
- [How the services connect](docs/mvp-contract.md#how-the-services-connect): local proxy, deployed path, security, and operations.
- [Testing expectations](docs/mvp-contract.md#testing-expectations): business-rule and journey coverage.

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

The connected frontend needs one credentialed API client, CSRF headers on unsafe requests, protected route loaders, role-aware navigation, consistent API error handling, and route/data revalidation after mutations. Follow `frontend/AGENTS.md` for route, feature, service, and `src/type/<feature>.ts` conventions. The backend remains authoritative for permissions and financial calculations; hiding a button is not authorization.

## Integration and deployment

The current Vite and Nginx configurations have no `/api` proxy. The target is a same-origin `/api/v1/` path through Nginx to Django, with session authentication and CSRF protection. Follow [How the services connect](docs/mvp-contract.md#how-the-services-connect) for local integration, production security, and operations work.

## Technology stack

- Python `>=3.12`; the API Docker image currently uses Python 3.13
- Django 6.1.1 and Django REST Framework 3.18.1 from `api/uv.lock`
- PostgreSQL 17 with Psycopg 3
- uv for Python dependencies and environments
- React 19, React Router 8, and TypeScript 5.9
- Vite 8 and Tailwind CSS 4
- Nginx for the built frontend container
- Docker Compose for local multi-service orchestration

## Run and validate

Use [Setup, run, and validation commands](docs/mvp-contract.md#setup-run-and-validation-commands) for the full Docker, API, and frontend workflows. The API runs on port 8000 and the frontend on port 5173 by default. Review custom-user migration history before changing a shared or persistent database.

For code changes, run the relevant commands that exist today: from `api/`, `uv run --no-sync python manage.py check`, migration checks, the backend tests and format checks; from `frontend/`, `npm run typecheck` and `npm run build`. There is no frontend test or lint script yet. The [CI baseline](docs/mvp-contract.md#continuous-integration-baseline) and [implementation order](docs/mvp-contract.md#recommended-implementation-order) are target guidance.

## Testing expectations

For behavior changes, cover the applicable cases in the [detailed testing contract](docs/mvp-contract.md#testing-expectations). Use the existing validation commands linked above; add frontend test/lint tooling before requiring those scripts.

## Definition of done

A change is complete when the applicable requirements below are met; documentation-only and isolated UI changes do not require unrelated backend migrations, financial tests, or deployment work:

- behavior matches the approved decisions and implemented API contract
- permissions and tenant scoping are enforced on the backend, including related-object inputs
- database constraints and transaction/locking behavior protect the same invariants under concurrency
- success, validation, permission, cross-tenant, lifecycle, and concurrency tests are added as relevant
- schema migrations are reviewed and migration checks pass
- API schema and human documentation are updated when the contract changes
- relevant backend and frontend validation commands pass locally, and in CI when those checks are configured
- logs and errors contain enough context to diagnose failures without exposing secrets or sensitive data
- deployment, rollback, monitoring, or backup implications are documented for operational changes

## Working rules for agents

- Use the relevant contract section and package guide for the area being changed. Read models, migrations, settings, URLs, package scripts, and other files when they are relevant to that change.
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
- Add or update meaningful tests for behavior changes where a test harness exists; run the relevant validation commands. Frontend test/lint scripts do not exist yet.
- Keep the OpenAPI schema and error contract synchronized with implemented endpoints.
- Treat production security settings, database backups, idempotency, and observability as application requirements, not deployment afterthoughts.
- Update this guide when approved product decisions change or its repository-status claims become stale. Update `docs/mvp-contract.md` when detailed requirements or route status change, and the relevant package guide when its structure or implementation status changes.
- Never silently change the one-owner, one-business-per-account model.
