# Connected form preference

Use this guide when a CollectFlow form submits to an implemented API. Follow `frontend/AGENTS.md` for the route, action, service, and shared client boundaries. Existing in-memory form prototypes are not connected-flow examples.

## Types and validation

- Inspect the implemented endpoint and its OpenAPI contract before defining fields. Put exported API write types in `src/type/<feature>.ts` (singular `type`); use distinct create and update types when their permitted fields differ. Keep server-owned fields out of writes.
- Keep each form's Zod schema with its feature in `src/screens/<feature>/`. Define runtime checks for required fields, formats, lengths, and cross-field rules that the form needs. Parse submitted values with `safeParse`; convert the validated result to the API write shape without an unchecked cast. Check at compile time that the final payload conforms to the imported write type.
- Include form-only inputs, such as password confirmation, in form validation, then omit them from the payload. Preserve the API's decimal-string and date formats; do not calculate authoritative balances or statuses in the browser. Client validation improves feedback; Django remains authoritative for permissions and business rules.
- Add Zod to frontend dependencies when implementing the first connected form. This preference file alone does not require an application dependency change.

## Submission and feedback

- Use React Router `<Form>` with a route action for submissions that navigate. Use `fetcher.Form` or `fetcher.submit` for in-place changes. The action reads `FormData`, validates it with Zod, calls the feature service with the typed payload, and returns field or form errors on failure. It redirects after a successful navigation form; successful in-place actions revalidate route data.
- Show validation errors on submit, then update or clear them as users correct fields. Show safe API validation errors beside the corresponding fields and other safe API errors at form level. Preserve appropriate entered values after errors, but do not return or echo passwords, tokens, or other secrets in action data.
- Associate each input with a visible label and its error text; set `aria-invalid` when invalid and use `aria-describedby` for the message. Make errors easy to find after submission, show a pending state, and prevent accidental duplicate submissions. Keep `409` conflicts and `429` throttling actionable without exposing internal errors.
- Use only implemented operations. Do not present a mock or in-memory submission as a persisted success.

For a connected form implementation, verify success, invalid input, server errors, and duplicate submission behavior; run `npm run typecheck` and `npm run build` from `frontend/`.
