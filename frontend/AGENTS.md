# CollectFlow Frontend Agent Guide

This file applies to work under `frontend/`. The root `AGENTS.md` is the approved product and API contract; follow it for roles, tenant boundaries, money, lifecycle rules, and planned behavior. This file defines frontend structure and responsibilities. A user's explicit request takes precedence over either guide.

## What exists today

- The stack is React 19, React Router 8 in Data Mode, TypeScript 5.9, Vite 8, and Tailwind CSS 4. The app is a browser-rendered SPA served as static files by Nginx in the current Docker setup.
- `src/main.tsx` mounts the router from `src/router.tsx`. The public `/` route renders `src/screens/welcome/WelcomePage.tsx`, styled with Tailwind tokens in `src/welcome.css`. Its account buttons are intentionally inactive, and its collection previews use illustrative data. Unknown routes have a fallback page. The old `src/routes/` prototypes and `src/styles.css` are retained but are not mounted; their in-memory data, login, and registration are not connected to Django.
- There is no credentialed API client, CSRF handling, protected routing, or frontend test/lint script yet. The existing screens and local data are disposable UI prototypes, **not architecture examples** for connected features. Do not claim that a prototype flow persists data or authenticates users.

## Target file structure

Use this structure as connected features replace the prototypes. Do not move unrelated prototype files merely to make the tree match.

```text
src/
  main.tsx                    # Mount RouterProvider and global styles
  router.tsx                  # createBrowserRouter route tree
  api/
    client.ts                 # One shared HTTP/CSRF/error client
  components/
    EntityModal.tsx           # Reusable UI, one file per component; no subfolders
  screens/
    customers/
      CustomersPage.tsx       # Feature screens
      CustomerDetailPage.tsx
      CustomerFormPage.tsx
      loader.ts               # Route reads, only where needed
      action.ts               # Route mutations, only where needed
      service.ts              # Customer API calls
      helpers.ts              # Private feature helpers, only where needed
    auth/
      LoginPage.tsx
      RegisterPage.tsx
      loader.ts
      action.ts
      service.ts
  type/
    customers.ts             # Exported customer read/write types
    auth.ts                  # Exported auth read/write types
```

- Group related pages by feature in `src/screens/<feature>/`; give a standalone screen its own folder. Use lowercase kebab-case feature folders (for example `follow-ups`) and PascalCase screen/component filenames. Keep feature-only UI and helpers inside the feature folder. Put UI reused across features directly in `src/components/`, with no component subfolders.
- Put the feature's endpoint-calling `service.ts` beside its screens, loaders, and actions. `src/api/client.ts` owns only generic transport behavior; it does not contain customer, payment, or other domain endpoint methods.
- Put exported object and API contract types in `src/type/<feature>.ts` (singular `type`). Define separate read and write shapes, such as `CustomerRead` and `CustomerWrite`; split create/update inputs when their allowed fields differ. Derive these from the implemented OpenAPI contract. Read types may include server-generated IDs, balances, and statuses; write types must exclude server-owned fields such as business, role, actors, lifecycle timestamps, and calculated values. Use `import type` when consuming them. Keep types used only by one screen, such as transient form state, local to that screen.

## Routing

- Define the route objects once in `src/router.tsx` with `createBrowserRouter`; `src/main.tsx` only mounts the router and imports global styles. Register each screen's component, loader, action, and nearest useful error boundary there. The app layout renders child routes through `<Outlet />`.
- Keep `/login` and `/register` public. Nest authenticated collection screens under the app layout. The planned routes are `/` (dashboard); `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/edit`; equivalent list/new/detail/edit flows for receivables and promises; `/payments`, `/payments/new`, `/payments/:id/edit`; `/follow-ups`, `/follow-ups/new`; `/staff`; `/settings/business`; and `/settings/profile`. Add routes or actions for approved lifecycle operations when their UI is built. Use the root guide as the source of truth for the exact product journey.
- The dashboard defaults to the current month and supports today, this week, this month, and a custom range. Only owners can reach staff management and business settings; owners and staff share daily collection routes. The UI may hide unauthorized navigation, but Django must enforce every permission.
- Load the current user through the auth service for protected navigation. Handle `401` in every protected data path: React Router can run matched loaders in parallel, so a parent loader alone cannot prevent a child loader's request. Redirect unauthenticated users to `/login`; show a permission state for `403`, a not-found state for missing or foreign resources, and a safe error boundary for unexpected failures. Add a catch-all route for unknown URLs. Registration success goes to `/login` without treating the user as signed in.
- Use route params for resource IDs and URL search params for shareable filters, page numbers, ordering, and dashboard periods. Validate them before calling a service. Use `Link`/`NavLink` for internal navigation rather than full page reloads.

## Data and mutation flow

The boundary is **screen → route loader/action → feature service → shared API client → Django**. Components render route data and local presentation state; they do not call `fetch` or mutate domain data directly.

- **Loaders:** Read and validate params/search params, call feature services, pass `request.signal` through to cancel obsolete reads, and return typed data for `useLoaderData`. Throw or redirect for route-level failures. Do not compute authoritative balances or statuses in the browser.
- **Actions:** Parse submitted form data, apply UI-level validation, call feature services with a typed write shape, and return field/form errors for `useActionData` or `fetcher.data`. Redirect after successful navigation forms. Keep transaction and financial rules in Django. Do not use an action as a second HTTP client.
- Use React Router `<Form>` and `useNavigation` for submissions that move to another page. Use `fetcher.Form` or `fetcher.submit` for in-place changes such as archive, restore, cancel, void, and staff activation. Show pending state and prevent accidental duplicate submissions. Let successful actions revalidate loader data; customize revalidation only for a measured need.
- Do not issue API `DELETE` for domain records. Use the approved archive, cancel, void, deactivate, and restore endpoints. Payment creation must send a client-generated idempotency key as required by the API contract; retry the same attempt with the same key.

## API and errors

- The shared client uses same-origin `/api/v1/` URLs, `credentials: "include"`, the CSRF token on unsafe methods, and the caller's abort signal. Obtain/refresh CSRF as required by the auth endpoints; never disable CSRF or store passwords, session IDs, or CSRF tokens in persistent browser storage. A Vite `/api` proxy is the preferred local integration path; Nginx proxies `/api/` in deployment once implemented.
- Parse the documented JSON error envelope once in the client and expose a typed error with status, safe message, field details, and request ID. Actions present validation errors beside fields; `409` conflicts and `429` throttling get actionable messages; route errors go to the nearest boundary. Do not render raw stack traces, SQL, or internal exception text.
- Keep amounts as decimal strings, dates as `YYYY-MM-DD`, and datetimes as timezone-aware ISO 8601 values in API types. Use `Asia/Beirut` for business-date presentation and USD for money. Do not send business IDs, roles, actor fields, balances, or statuses as authoritative input.

## Adding or changing a feature

1. Check the root product contract and the implemented API/OpenAPI schema for the affected flow. Do not treat planned endpoints as already available.
2. Add or update exported read/write types in `src/type/<feature>.ts`, the feature's `service.ts`, and its loaders/actions as needed; then build screens and feature-only UI.
3. Register the route objects in `src/router.tsx`, including appropriate auth/role behavior and an error boundary. Add shared UI to `src/components/` only when it is actually reused.
4. Cover the relevant success, validation, permission, loading, and error states. Keep frontend authorization as UX only; verify the backend response remains authoritative.
5. From `frontend/`, run `npm run typecheck` and `npm run build` for code changes. There is currently no frontend `test` or `lint` script; add the tooling and script before requiring either command.

Keep this guide synchronized when the structure or available scripts change. Update the current-state paragraph when the prototypes are replaced so future agents can distinguish implemented behavior from target behavior.
