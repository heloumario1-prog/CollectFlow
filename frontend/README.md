# CollectFlow frontend

CollectFlow's frontend is a React 19, React Router 8, TypeScript, Vite, and Tailwind CSS single-page app. It builds to static files in `dist/`; the Docker image serves them with Nginx.

## Run locally

From `frontend/`:

```bash
npm ci
npm run dev
```

Vite serves the app at `http://localhost:5173` and proxies `/api` to Django at `http://127.0.0.1:8000`. Start the API separately for connected account pages.

## Check and build

```bash
npm run typecheck
npm run build
```

`npm run build` writes static assets to `dist/`. There is no frontend test or lint script yet.

## Current routes

The public welcome page is `/`. Login and registration use the mounted auth API. Successful login opens `/dashboard`. The protected workspace includes connected staff management at `/staff`, profile and password settings at `/settings/profile`, and manager-only business settings at `/settings/business`. Dashboard financial figures and the collection areas are still placeholders because their APIs are not mounted.

## Stylesheets

Frontend stylesheets live in `src/css/`:

- `welcome.css` contains the Tailwind theme and public account-page styles and is imported by `src/main.tsx`.
- `dashboard.css` styles the workspace shell and dashboard.
- `workspace-pages.css` styles staff and settings pages. Both workspace files are imported by `src/components/AppLayout.tsx`.
- `styles.css` belongs to the unmounted legacy prototypes and is retained as a reference.

The production Nginx configuration serves the SPA and proxies `/api/` to the API service. See `AGENTS.md` for the frontend structure and the root product contract for approved behavior.
