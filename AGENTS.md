# CollectFlow Agent Guide

## Read this first

CollectFlow is a multi-tenant receivables-management application for Lebanese small businesses and suppliers that sell to customers on credit. It replaces scattered WhatsApp messages, notebooks, and spreadsheets with one record of customers, receivables, payment promises, payments, and collection follow-ups.

This file states repository-wide product decisions and routes to the detailed MVP contract in `docs/mvp-contract.md`. All product API areas and the mounted SPA are connected. Distinguish tested implementation from the remaining database, security, and operational targets documented below. For task-specific implementation details, use `api/AGENTS.md` when working under `api/` and `frontend/AGENTS.md` when working under `frontend/`; inspect only the files relevant to the task.

Use this authority order when information conflicts:

1. The user's current, explicit instruction.
2. The approved product decisions here and the relevant requirements in `docs/mvp-contract.md`.
3. The code, migrations, and package scripts for facts about what exists today.
4. The root README, which contains shared setup and validation instructions.

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
- Follow-ups support separate completion and removal. The interface calls removal ?Delete follow-up?; it archives the record and actor instead of permanently deleting history. Completion does not clear the customer?s next follow-up date.
- Direct edits to active payments remain allowed. The current schema does not record who edited a payment; this is an accepted MVP limitation, not an audit feature.

If a requested change contradicts one of these decisions, point out the conflict before implementing it.

## Current repository state

The mounted application is connected to Django; older descriptions of disconnected collection prototypes are obsolete. See `docs/project-review.md` for verification scope and remaining limitations.

### Backend today

- All auth, business, staff, customer, receivable, promise, payment, follow-up, dashboard, and audit routes are mounted under `/api/v1/`.
- Session authentication and CSRF are used. Owner/staff permissions and tenant-scoped related inputs are enforced on the API. Registration is atomic and handles duplicate-email races without creating an orphan business.
- Financial balances and status filters use live payment aggregates. Payments on cancelled promises still reduce debt; voided payments do not. API `KEPT` is displayed as Completed.
- Domain writes hold an outer transaction and business row lock through validation, saving, and audit. This intentionally serializes mutations within one business. PostgreSQL concurrency tests cover promise capacity, payment capacity, and keyed payment retries.
- Payment creation supports an optional `Idempotency-Key` header for compatibility; the connected form supplies it. `payments.0002_paymentrequest` adds durable replay records without changing existing financial rows. Follow-up completion and retained removal use `followups.0002_followup_lifecycle`.
- `config.test_settings` uses RAM-only SQLite; `scripts/test_postgres.py` creates a newly named disposable PostgreSQL test database. Neither uses existing records as fixtures. `scripts/check_data.py` reports read-only integrity counts.
- Development settings are explicit. Production requires an environment secret, allowed hosts, trusted HTTPS origins, secure cookies, and TLS. Application auth throttles use Django's cache; multi-worker deployments still need a shared cache and edge limits.
- The schema still permits nullable business phones, multiple owners, and cross-tenant ORM relationships. API validation enforces these rules; database constraints and custom-user/admin changes require a separately reviewed migration strategy. Do not silently change or reset authentication history.
- Direct payment edits retain the original recorder. The payment schema still has no edit actor/timestamp; do not present this as a complete financial audit system.

### Frontend today

- React 19, React Router 8, TypeScript, Vite and Tailwind form a static SPA. The shared credentialed client handles CSRF, cancellation, replay keys, and safe errors.
- All mounted collection screens use real APIs. Customer history includes receivables, promises, payments and visible follow-ups, plus the manual WhatsApp link. Welcome-page preview figures are explicitly illustrative.
- The dashboard consumes the backend summary and exposes today/week/month/custom collection periods. It does not recalculate authoritative balances in the browser.
- Customer/receivable archive filters and restoration, promise lifecycle filters, payment method/history filters, staff filters, and collection searches remain meaningful even when empty. Financial records cannot be hard-deleted. Follow-up Delete archives its history; Mark completed is independent.
- Shared dialog focus is initialized on opening, preserved while typing, trapped during keyboard navigation, and returned to an available trigger. Background content is inert while a modal or mobile navigation drawer is open.
- Colors are centralized in `frontend/src/css/palette.css`: navy text/navigation, neutral backgrounds, white surfaces, teal actions, and semantic success/warning/error/info tokens. No separate theme toggle exists.
- Vite proxies `/api` to Django (default 8000, configurable with `API_PROXY_TARGET`); Nginx proxies `/api/` to Compose's API. Local development here uses API 8001 and Vite 5173 because 8000 belongs to another application.
- Frontend checks: `npm run typecheck`, `npm run build`, `npm test`, and optional isolated `npm run test:browser`. Browser setup is documented in `docs/project-review.md`.

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
| `frontend/src/main.tsx`, `frontend/src/router.tsx` | SPA mounting, shared styles, route definitions, loaders/actions and loading/error boundaries |
| `frontend/src/routes/`, `frontend/src/data/` | Mounted collection screens and API adapters |
| `frontend/AGENTS.md` | Target frontend route, feature, service, and type structure |
| `frontend/src/css/` | Central navy/teal palette, shared styles and page layouts |
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

Vite and Nginx proxy same-origin `/api/v1/` requests to Django, with session authentication and CSRF protection. Vite defaults to port 8000; `API_PROXY_TARGET` supports an alternate local API port. Follow [How the services connect](docs/mvp-contract.md#how-the-services-connect) for local integration, production security, and operations work.

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

For code changes, run the relevant commands that exist today: from `api/`, `uv run --no-sync python manage.py check`, migration checks, the backend tests and format checks; from `frontend/`, `npm run typecheck` and `npm run build`. The frontend has API/service regression tests and an isolated browser review script; no lint script is configured. The [CI baseline](docs/mvp-contract.md#continuous-integration-baseline) and [implementation order](docs/mvp-contract.md#recommended-implementation-order) are target guidance.

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
