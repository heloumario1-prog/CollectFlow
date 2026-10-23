import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";
import { readFileSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true, watch: null }, appType: "custom" });
const { apiRequest, ApiError } = await server.ssrLoadModule("/src/api/client.ts");
const originalFetch = globalThis.fetch;
globalThis.document = { cookie: "csrftoken=review-csrf" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
after(async () => { globalThis.fetch = originalFetch; delete globalThis.document; await server.close(); });

test("shared text, action, navigation and semantic colors meet 4.5:1 contrast", () => {
  const css = readFileSync(new URL("../src/css/palette.css", import.meta.url), "utf8");
  const tokens = Object.fromEntries([...css.matchAll(/--cf-([\w-]+):\s*(#[0-9a-f]{6})/g)].map(match => [match[1], match[2]]));
  function luminance(hex) {
    const values = hex.slice(1).match(/../g).map(value => parseInt(value,16)/255).map(value => value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
    return values[0]*0.2126+values[1]*0.7152+values[2]*0.0722;
  }
  for (const [foreground,background] of [["text","surface"],["muted","background"],["surface","accent"],["surface","danger"],["nav-text","nav"],["nav-muted","nav"],["nav-accent","nav-border"],...["success","warning","danger","info"].map(tone=>[tone,`${tone}-soft`])]) {
    const values=[luminance(tokens[foreground]),luminance(tokens[background])].sort((a,b)=>b-a);
    assert((values[0]+0.05)/(values[1]+0.05)>=4.5, `${foreground} on ${background}`);
  }
});

test("unsafe requests refresh CSRF, include credentials and a stable replay key", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return url.endsWith("csrf/") ? json({}) : json({ id: 7 }, 201); };
  assert.deepEqual(await apiRequest("payments/", { method: "POST", body: { amount: "20.00" }, idempotencyKey: "retry-key" }), { id: 7 });
  assert.equal(calls[0].url, "/api/v1/auth/csrf/");
  assert.equal(calls[1].options.credentials, "include");
  assert.equal(calls[1].options.headers.get("X-CSRFToken"), "review-csrf");
  assert.equal(calls[1].options.headers.get("Idempotency-Key"), "retry-key");
});

test("nested registration validation stays attached to its exact fields", async () => {
  globalThis.fetch = async () => json({ owner: { email: ["Already registered"], password: ["Too common"] }, business: { phone_e164: ["Invalid phone"] } }, 400);
  await assert.rejects(apiRequest("auth/register/"), error => {
    assert(error instanceof ApiError);
    assert.deepEqual(error.fields, { "owner.email": "Already registered", "owner.password": "Too common", "business.phone_e164": "Invalid phone" });
    return true;
  });
});

test("CSRF network failures and non-JSON gateway failures have usable safe errors", async () => {
  globalThis.fetch = async () => { throw new TypeError("Network failed"); };
  await assert.rejects(apiRequest("payments/", { method: "POST" }), error => error instanceof ApiError && error.status === 0 && error.message.includes("unavailable"));
  globalThis.fetch = async () => new Response("<h1>Private upstream diagnostics</h1>", { status: 502 });
  await assert.rejects(apiRequest("auth/me/"), error => error.status === 502 && !error.message.includes("diagnostics"));
});

test("aborted requests retain their abort and 204 responses do not parse JSON", async () => {
  const controller = new AbortController(); controller.abort();
  globalThis.fetch = async () => { throw controller.signal.reason; };
  await assert.rejects(apiRequest("auth/me/", { signal: controller.signal }), error => error.name === "AbortError");
  globalThis.fetch = async url => url.endsWith("csrf/") ? json({}) : new Response(null, { status: 204 });
  assert.equal(await apiRequest("auth/logout/", { method: "POST" }), undefined);
});

test("customer pagination follows all pages and preserves archive filters", async () => {
  const { listCustomers } = await server.ssrLoadModule("/src/data/customers.ts");
  const calls = [];
  globalThis.fetch = async url => { calls.push(url); return json({ results: [{ id: calls.length }], next: calls.length === 1 ? "http://untrusted.invalid/page2" : null }); };
  assert.deepEqual(await listCustomers("archived"), [{ id: 1 }, { id: 2 }]);
  assert(calls.every(url => url.startsWith("/api/v1/customers/?") && url.includes("is_archived=true")));
  assert(calls[1].includes("page=2"));
});

test("eligible promises exclude cancelled, completed, other customers and archived debts", async () => {
  const { listPromisesForCustomer } = await server.ssrLoadModule("/src/data/payment-promises.ts");
  const base = { customer_id: 1, receivable: 1, remaining_amount: "20.00", promised_on: "2026-10-23", status: "PENDING" };
  globalThis.fetch = async url => json({ next: null, results: url.includes("/promises/") ? [
    { ...base, id: 1 }, { ...base, id: 2, status: "CANCELLED" }, { ...base, id: 3, remaining_amount: "0.00", status: "KEPT" }, { ...base, id: 4, customer_id: 2 }, { ...base, id: 5, receivable: 2 },
  ] : [{ id: 1, customer_detail: { id: 1 }, archived_at: null }, { id: 2, customer_detail: { id: 1 }, archived_at: "2026-10-20" }] });
  assert.deepEqual((await listPromisesForCustomer(1)).map(item => item.id), [1]);
});

test("staff email whitespace is normalized; API KEPT is displayed as Completed", async () => {
  const { staffCreateSchema } = await server.ssrLoadModule("/src/screens/staff/schema.ts");
  assert.equal(staffCreateSchema.parse({ full_name: "Staff", email: " STAFF@example.test ", password: "Strong!Review48" }).email, "staff@example.test");
  const { promiseStatusInfo } = await server.ssrLoadModule("/src/data/promises.ts");
  assert.equal(promiseStatusInfo("KEPT").label, "Completed");
  const { statusInfo } = await server.ssrLoadModule("/src/data/receivables.ts");
  assert.equal(statusInfo("OVERDUE").key, "overdue");
});

test("editing a cancelled promise payment respects commitments on other promises", async () => {
  const { listPromisesForCustomer } = await server.ssrLoadModule("/src/data/payment-promises.ts");
  globalThis.fetch = async url => json({ next: null, results: url.includes("/promises/") ? [
    { id: 7, customer_id: 1, receivable: 1, remaining_amount: "60.00", promised_on: "2026-10-23", status: "CANCELLED" },
  ] : [{ id: 1, customer_detail: { id: 1 }, archived_at: null, unpromised_amount: "20.00" }] });
  const options = await listPromisesForCustomer(1, { paymentPromiseId: 7, amount: 40 });
  assert.equal(options[0].remaining_amount, "60.00");
});
