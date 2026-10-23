# Implemented API contract

This describes current wire behavior, rather than the remaining targets in `mvp-contract.md`. Base path: `/api/v1/`. Requests are same-origin with Django sessions. Fetch `auth/csrf/` and send the current `csrftoken` as `X-CSRFToken` on unsafe requests; login rotates the secret.

| Area | Implemented operations | Access |
| --- | --- | --- |
| `auth/` | GET csrf/me; POST register/login/logout/change-password | Register/login/CSRF public; profile/password require active membership; logout authenticated |
| `business/` | GET, PATCH | Active members read; manager updates |
| `staff/` | GET list, POST create; GET/PATCH `:id/`; POST `:id/deactivate/`, `reactivate/`, `reset-password/` | Manager, own business, STAFF targets only |
| `customers/` | GET list/detail; POST create; PATCH; POST `:id/archive/`, `restore/` | Active members, own business |
| `receivables/` | GET list/detail; POST create; PATCH; POST `:id/archive/`, `restore/` | Active members, own business |
| `promises/` | GET list/detail; POST create; PATCH; POST `:id/cancel/` | Active members, inherited tenant |
| `payments/` | GET list/detail; POST create; PATCH; POST `:id/void/` | Active members, inherited tenant |
| `followups/`, `follow-ups/` | GET list/detail; POST create; PATCH; POST `:id/complete/`, `archive/` | Active members, inherited tenant |
| `dashboard/` | GET summary/queues | Active members, own business |
| `audit/` | GET paginated events | Manager, own business |

Domain DELETE requests return 405. Lifecycle actors/timestamps, tenant ownership, user roles, balances and statuses are server assigned. Foreign detail/action targets return 404; foreign related input IDs fail validation. Money is returned as decimal strings; dates are YYYY-MM-DD and datetimes are timezone-aware ISO 8601. Domain/audit lists return `{count,next,previous,results}` with 25 rows per page. Staff retains its existing array response.

## Filters

Customers: `is_archived=false|true|all`, `search`, whitelisted `ordering` (name, created_at, next_follow_up_on, optionally descending). Receivables: archive, customer, search, due_date_from/to, derived `status=OPEN|PARTIALLY_PAID|OVERDUE|PAID|ALL`. Promises: receivable/customer, promised_on_from/to, derived `status=PENDING|BROKEN|KEPT|CANCELLED|ALL`. Payments: promise/receivable/customer, CASH/WHISH method, is_voided, paid_on_from/to. Follow-ups: customer/receivable/payment_promise. Audit: entity_type/action. Invalid relationship/date/status filters return 400. Some UI filters/searches operate on the complete paginated result rather than sending a server filter.

Archived customer/receivable details require `is_archived=true|all`; restoration uses `?is_archived=true`. Follow-up archives remain excluded from normal list/detail/update and subsequent lifecycle actions.

## Financial and lifecycle writes

- Receivable input: customer, positive original_amount, due_date, optional issue_date/reference/description. A blank reference or issue date can be cleared with null. Principal cannot fall below paid plus remaining active commitments. A receivable with promise history cannot move to another customer.
- Promise input: receivable, positive amount, promised_on, optional note. Capacity includes payments retained on cancelled promises. Paid promise history cannot be reassigned to another receivable. Cancellation requires `cancel_reason` of at least three characters. Responses include read-only receivable/customer archive timestamps so clients can avoid offering new activity on archives.
- Promise status precedence is Cancelled, Completed (API KEPT), Broken (past Beirut date and unpaid), then Pending. Completion never changes principal or invents a payment.
- Payment input: payment_promise, positive amount, paid_on no later than today in Beirut, CASH/WHISH method, optional note. Active edits may change promise/amount/date/method/note while preserving both chains. Original recorded_by is unchanged. Voiding requires `void_reason` of at least three characters. Voided records are immutable. Restore archived customer/receivable chains before financial corrections.
- Follow-up input: customer, optional receivable/payment_promise, occurred_at, note, optional next_follow_up_on. Omission preserves the customer's schedule; null clears it; a date sets it in the same transaction. PATCH can clear optional links with null. Completion is idempotent, returns 200 and exposes read-only completed_at. UI Delete calls archive, returns 204, and retains the note, actors and timestamps. Neither lifecycle action changes financial balances or the next-date schedule.

## Payment replay protection

The connected form supplies `Idempotency-Key` on POST payments. The server stores the key, request fingerprint and original 201 response in the same transaction as the payment and audit event, scoped to the authenticated business. A repeated matching request returns the original result; a changed payload returns 409. This survives process restarts and is protected under concurrent PostgreSQL requests. Keys must contain 1 to 100 characters. Unkeyed clients remain accepted for compatibility; do not assume their retries are idempotent. The migration adds only `PaymentRequest`, leaving existing records untouched. Keep the table when rolling application code back so replay/history metadata is not lost.

## Dashboard

`period=today|this_week|this_month` or `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`. Both custom bounds are required and end cannot precede start. The response includes period metadata, nine metrics, and broken/upcoming/due-customer queues. Collections use the selected dates and non-voided payments (including archived history); current balances include non-voided payments on cancelled promises. Outstanding/overdue/unpromised apply to active receivables. Business-date decisions use Asia/Beirut.

## Errors and security limits

Validation retains DRF field dictionaries/nested registration dictionaries or detail/non_field_errors. The shared frontend client normalizes those into safe field errors. Session-authentication failures currently return 403, as do authenticated role denials; missing/foreign resources return 404, keyed conflicts 409, throttles 429. Do not infer the target uniform error envelope or 401 behavior is implemented.

Application limits: login 20/minute per address and 10/minute per normalized account; registration 5/minute per address; authenticated password/staff-creation operations 20/minute per user. Django cache stores counters. Shared-cache atomicity and edge enforcement must be configured/verified for a multi-worker production deployment. Generated OpenAPI tooling and complete security-event logging remain unimplemented targets; this human contract is maintained alongside serializers/tests.
