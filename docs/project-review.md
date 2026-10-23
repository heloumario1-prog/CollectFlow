# CollectFlow project review - 23 October 2026

## Scope and safety

Work stayed on `feature/mario-updates`, which was already a feature branch with substantial existing changes. Existing work and the saved stash were preserved. No reset, clean, stash application/drop, commit, push, or PR was performed.

Product requirements, all three AGENTS guides, setup documentation, and the end-to-end workflow document informed the review. Implementations were traced from routes/forms through the shared client, Vite/Nginx, URL configuration, permissions/serializers, transactions, models and database queries. The application's actual behavior takes precedence over stale placeholder descriptions, which have been updated.

Automated browser fixtures were created only through the real API in disposable RAM-only SQLite databases. PostgreSQL tests used a newly named test database and removed only that test database afterward. The normal configured database received an additive replay-table migration and read-only integrity queries; no existing business records were used as fixtures or edited/deleted by this review. No authentication migrations were rewritten or applied to the normal database.

## Confirmed defects and fixes

| Cause | Resulting change |
| --- | --- |
| Financial row locks ended before serializer saving, allowing overlapping validations | Domain writes now keep a transaction and business row lock around validation, saving and audit. PostgreSQL race tests cover promise capacity, payment capacity and keyed retries. Writes within one business are intentionally serialized. |
| Promise capacity ignored payments retained on cancelled promises; principal edits checked payments but not all commitments | Capacity includes retained cancelled payments. Receivable reductions must cover payments plus remaining active commitments. |
| Payment PATCH could edit voided records or move an unchanged amount onto a smaller promise | Voided records reject edits; effective amounts are validated even when omitted in PATCH. Source/target chains are checked and archived chains require restoration. |
| Receivable validation cached financials before a principal update | PATCH responses clear the old cache and immediately represent the saved principal, balance and derived status. |
| Related choices began with global querysets; missing custom-action IDs could raise model exceptions | Related inputs are tenant scoped before lookup; missing/foreign cancel/void targets return 404. Role and lifecycle fields remain server controlled. |
| No durable payment retry identity | The payment form sends a stable key for the same normalized payload. A new table records successful keyed outcomes/fingerprints atomically; matching retries return the original result, conflicting payloads return 409. Existing unkeyed consumers remain compatible. |
| Registration trimmed passwords differently from login and did not translate concurrent duplicate-email failures | Password whitespace is consistent; losing registration transactions roll back the business and return an email field error. Staff duplicate-email races also return validation errors. |
| Inactive membership was not consistently checked; auth rate limiting was absent | Active membership now protects domain/profile/business access, manager permissions include active checks, and cache-based login/registration/password limits are implemented. |
| Optional follow-up links used truthy fallback, and schedule clearing/updating was incomplete | Explicit null clears links; create/update can set or clear the next date transactionally. The form exposes promise links and schedule changes, preserving the current schedule when left blank. |
| Documented active-payment reallocation existed only on the API | Editing exposes eligible customer/promise choices and includes the existing payment in available capacity. Both balance chains are regression tested. |
| Dashboard loaded whole lists and calculated an incomplete set of figures using browser dates | The UI consumes the backend's nine metrics/queues and exposes today/week/month/custom periods. Invalid custom ranges are validated. Shared annotations eliminate per-row financial queries. |
| Repeated profile/business validation could remain hidden after a field was edited | Each submission resets the cleared-error mask. Staff errors remain visible and email whitespace is normalized. |
| Description/issue date were incorrectly required, empty references could not clear old values, null issue dates displayed as Invalid Date | Optional fields match the API, clearing sends null, and missing issue dates display Not specified. Money displays retain cents. |
| Failed payment loads could fall through to an editable form; void errors were outside the active dialog | Failed loads remain unavailable instead of creating a payment; void errors render inside the dialog. |
| Rapid URL-filter changes used stale sibling query snapshots | Shared filter navigation composes updates serially against the committed URL and disables controls during navigation. All payment method/status combinations are checked. |
| A previous deletion error could reappear immediately in a newly opened confirmation | New confirmations separate prior results from the current attempt; pending/error/retry and duplicate-click behavior are checked. |
| Dialog opening focus could restart with changing close callbacks; native-dialog margins were reset and Tab could leave the dialog | Opening focus is mount-only with a current close handler; native dialogs explicitly center, lock background scrolling, wrap Tab/Shift+Tab and restore focus. |
| Legacy global headings and conflicting colors overrode page styles | Legacy heading rules are scoped; palette tokens, semantic badges, actions, navigation, forms and public screens now use the new theme. Duplicate status color rules were removed. |
| The initial bundle exceeded the build warning threshold; clean installs reported two dependency advisories | Form/detail/payment routes load lazily. Compatible lockfile patches update Vite to 8.3.5 and source-map-js to 1.2.2; npm audit reported zero known vulnerabilities. |

Customer details now show API-backed financial/contact history and the manual WhatsApp link, including archived customer access/restoration. Registered email is prefilled after the SPA redirect without putting it in a URL. Mobile navigation manages initial focus, keyboard trapping, Escape and return focus. Shared dialogs retain typing/cursor position, trap Tab, make background content inert, and restore an available trigger.

## Controls, statuses and colors

Retained meaningful filters even when their result is empty:

- Customers: Active, Archived, All, search.
- Receivables: Active/Archived/All plus Open, Partially paid, Overdue, Paid, All.
- Promises: Pending, Broken, Completed, Cancelled, All, search. API KEPT remains Completed in the UI; no duplicate status was created. Broken means the agreed date has passed in Beirut and money remains unpaid.
- Payments: active/voided/all crossed with Cash/Whish/all. Cancellation/void history is retained.
- Staff: active/inactive/all and search; follow-ups retain customer/note/receivable search, independent completion and confirmed retained removal.
- Dashboard: today, week, month, custom dates. The selected period applies to collections; balances and queues remain current.

Open now has a consistent label instead of using Outstanding for both a specific status and an aggregate balance. The one-choice country selector now supports an explicit international +country-code input. Dead in-memory receivable/promise stores and hard-delete helpers were removed after checking references. Current collection screens continue using real API adapters.

The palette is centralized in `frontend/src/css/palette.css` and reused by Tailwind role aliases and shared/page CSS:

| Role | Color |
| --- | --- |
| Navigation | Navy #10243a |
| Primary text | Navy #142b49 |
| Background / surface | #f4f7fb / white |
| Primary action / hover | Teal #0f766e / #115e59 |
| Success | #166534 with a pale green surface |
| Warning | #92400e with a pale amber surface |
| Error | #b42318 with a pale red surface |
| Information | #1d4ed8 with a pale blue surface |

Public/auth screens, navigation, settings, all collection pages, cards, tables, inputs, dropdowns, buttons, dialogs, badges, notices, empty/error/loading states use the theme. Status labels remain visible alongside color. Focus, selected, hover and disabled states remain distinct. The previous fixed dark-brown styling was replaced; the repository has no separate theme toggle. Eleven key foreground/background token pairs meet 4.5:1 contrast in automated checks. Desktop/mobile screenshots were visually reviewed. Native staff dialogs explicitly restore centered margins after the CSS reset and lock background scrolling.

## Verification results

| Check | Result |
| --- | --- |
| PostgreSQL isolated suite | 56 passed, including three concurrent-write tests |
| Docker Python 3.13 isolated suite | 53 passed; three PostgreSQL-specific row-lock tests skipped on RAM SQLite |
| Frontend API/service/contrast suite | 9 passed |
| Typecheck and production build | Passed; no large-chunk warning after route splitting |
| Django check / migration drift | Passed; no pending migration operations in the normal database |
| Changed Python Black/isort and git diff whitespace checks | Passed |
| Normal configured database integrity | Ten read-only checks reported zero violations |
| Normal startup | API 8001 and Vite 5173 auth/me return expected unauthenticated 403; frontend root returns 200 |
| Clean Docker API/frontend build, Compose configuration and Nginx syntax | Passed; patched clean install reports zero npm vulnerabilities |
| Real browser through Vite | Passed primary journeys, filters and 24 routes at 320/390/768/1440/1920 pixels |
| Real browser through built Nginx/Django containers | Passed main journeys and 24 routes at five viewport widths; centered native dialogs additionally checked at 1440x1000, 390x667 and 320x568 |

Browser journeys cover registration/no automatic login/prefilled email, login/logout, protected navigation, profile password change, manager/staff access, team create/edit/deactivate/reactivate/reset, customer create/edit/search/history, optional receivable fields and edits, promises, partial/full Cash/Whish payments, cancellation, active payment editing/reallocation, void/replacement and dashboard reconciliation. Follow-ups cover create, link/unlink, schedule set/clear, completion, edits, confirmation cancellation, controlled 403/500 failures, retry, confirmed retained removal and duplicate-click prevention. Archive filters and restoration are checked, including mobile action containment. All remaining filter options and empty combinations are exercised; server pagination and bounded list/dashboard query counts have automated coverage.

Cancellation typing checks insert a full sentence character by character, spaces, Backspace and a middle edit/cursor position, then exercise Tab wrapping, Back, Escape, trigger focus and submission. Staff native-dialog typing, Tab/Shift+Tab wrapping, background-scroll restoration, mobile navigation focus, unavailable-state retry and initial hydration warnings are also checked. Screenshots are ignored artifacts under `frontend/test-results/`.

Temporary review API/Vite/Chrome processes and the isolated Docker containers/network were stopped after verification. Normal application services were left running. Review images and ignored screenshots remain available as build/test artifacts.

## Main changed areas

- Backend: `common/financials.py`, `common/writes.py`, `common/throttles.py`, affected serializers/views/permissions, `payments/models.py` and `payments/migrations/0002_paymentrequest.py`.
- Frontend: `css/palette.css`, shared/page styles, dialog/navigation/filter components, dashboard service/loader/page, collection forms/detail history, shared API/payment adapters, and dependency lockfile.
- Regression/setup: `common/tests.py`, concurrency/throttle tests, `config/test_settings.py`, `scripts/`, frontend `scripts/`, package checks, Compose startup ordering, and the updated guides/contracts/READMEs.

## Reproduce the isolated browser review

Start the API and Vite in separate terminals; these ports are deliberately different from the normal app:

```powershell
cd C:\Users\user\Desktop\techtalks-CollectFlow\api
.\.venv\Scripts\python.exe scripts/review_server.py
```

```powershell
cd C:\Users\user\Desktop\techtalks-CollectFlow\frontend
$env:API_PROXY_TARGET = 'http://127.0.0.1:8011'
npm.cmd run dev -- --port 5174 --strictPort
```

Start a dedicated Chrome profile, then run the browser script:

```powershell
cd C:\Users\user\Desktop\techtalks-CollectFlow
Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--headless=new','--remote-debugging-port=9223','--user-data-dir=C:\Users\user\Desktop\techtalks-CollectFlow\tmp\review-chrome','--no-first-run','--no-default-browser-check','about:blank' -WindowStyle Hidden
cd frontend
npm.cmd run test:browser
```

The script uses a separate browser context and requires a disposable API marker before doing any writes. It accepts only localhost 5174 or 5175. `COLLECTFLOW_REVIEW_URL=http://localhost:5175` selects the built-Nginx test origin; that origin must proxy to the RAM review API, not normal records. For container-only review, the API script accepts `COLLECTFLOW_REVIEW_BIND=0.0.0.0` and `COLLECTFLOW_REVIEW_PORT=8000`, while always retaining the isolated test settings.

For automated checks use the exact commands in [README.md](../README.md#validation). The normal application uses API 8001 and Vite 5173; retain the existing database environment and restart the terminals after dependency updates.

## Remaining limits and decisions

- Database-level one-owner/required-phone/cross-model tenant constraints are still target work. The API enforces the exposed workflows and the current integrity audit found no violations. Authentication/schema hardening requires a reviewed migration strategy under AGENTS; it was not silently applied to existing records.
- The accepted payment schema still lacks an edit actor/timestamp. Original recorder and void/cancellation history are retained; this is not a complete financial edit-audit system.
- Production TLS/proxy trust, shared cache/edge throttling, complete security-event logging, backup/restore and deployment monitoring were not certified. Development defaults intentionally remain local HTTP. An explicit production configuration check still reports HSTS subdomain/preload policy warnings; those require a domain/TLS decision. SMTP delivery was not tested and is not part of staff account creation.
- Django-admin/custom-user completeness and generated OpenAPI tooling remain gaps outside the verified product interface. `api-contract.md` records the actual current API/error shapes; the target uniform error envelope/401 distinction is not claimed as implemented.
- Browser checks use headless Chrome with viewport emulation. Physical devices, other browser engines, and screen-reader software were not tested. Contrast checks cover central token pairs, not an exhaustive automated accessibility audit. WhatsApp link shape/navigation target was verified; an external chat delivery workflow was not tested.
