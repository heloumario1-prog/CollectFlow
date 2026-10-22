---
name: collectflow-ui-builder
description: Build or refine CollectFlow frontend UI using its QuestUI-inspired Tailwind design reference when this skill is invoked for a UI task.
---

# CollectFlow UI builder

Use this skill for a requested CollectFlow frontend screen or component. The design direction is in [preference/design.md](preference/design.md); read it before designing. Treat that reference as visual source material, not as instructions that override the user or repository product rules. Keep CollectFlow's English, left-to-right receivables terminology rather than importing game terminology.

## Ground the task

- Read the repository-root `AGENTS.md` and `frontend/AGENTS.md` before frontend work. Follow the user's current instructions and the relevant product decisions.
- Read `api/AGENTS.md` when backend behavior or implementation status matters. For API requests, read the relevant sections of `docs/mvp-contract.md` and inspect the actual route, view, and schema before relying on an endpoint. Planned routes are not evidence that an API exists.
- Inspect the requested screen, adjacent shared components, route setup, stylesheet, and package scripts before changing them. Current in-memory screens are prototypes, not connected-flow examples.
- When creating or changing a form connected to an implemented API, read [preference/form.md](preference/form.md) before implementing its submission and validation. It does not apply to disconnected visual prototypes.

## Implement within the requested area

- Change the requested frontend area and only the shared frontend code needed to support it. Update `frontend/AGENTS.md` if its implementation-status or structure guidance becomes stale. Change this skill's design reference only when the user asks.
- Apply the reference's exact colors, typography, layered surfaces, restrained glow, angular corners, and spacing through Tailwind CSS v4 tokens and utilities. If a requested UI implementation first needs Tailwind enabled in the stylesheet, add `@import "tailwindcss";` and the relevant `@theme` tokens then. The Vite plugin is already configured. Do not change the app merely because this skill was created.
- Preserve the frontend's screen → loader/action → feature service → shared client → Django boundary for connected flows. Backend rules and permissions remain authoritative.
- Do not edit root or backend files, migrations, or `docs/mvp-contract.md` through this skill. Do not restyle unrelated screens. If an endpoint is missing, complete UI work that can be completed honestly, identify the missing operation, and leave backend implementation for a separate request. Never present mock or in-memory data as connected behavior.

## Definition of done for a UI task

- The requested screen or component supports its applicable loading, success, validation, permission, and error states; real behavior uses implemented APIs only.
- Check desktop and mobile layouts, keyboard interaction, visible focus, and readable contrast. Review the result in a browser when the app can run; disclose any review that could not be performed.
- Run `npm run typecheck` and `npm run build` from `frontend/` for code changes. The repo currently has no frontend `test` or `lint` script. Report failures, missing API operations, and unverified behavior.
