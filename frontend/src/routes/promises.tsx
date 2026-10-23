import { useEffect, useState } from "react";
import { Link, useFetcher, useLoaderData, useSearchParams } from "react-router";
import { StatusBadge } from "../components/StatusBadge";
import { ListFilter } from "../components/ListFilter";
import { EntityModal } from "../components/EntityModal";
import { SaveFeedback } from "../components/SaveFeedback";
import { promiseStatusInfo, type ApiPromise } from "../data/promises";
import type { promisesLoader } from "../screens/promises/loader";
import type { promisesAction } from "../screens/promises/action";
import "../css/promises.css";

const money = (value: string | number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2,
}).format(Number(value));
const displayDate = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
}).format(new Date(`${value}T00:00:00Z`));
const paymentLink = (promise: ApiPromise) => `/payments/new?customer=${promise.customer_id}&promise=${promise.id}`;
const canPay = (promise: ApiPromise) => !promise.receivable_archived_at && !promise.customer_archived_at && !promise.cancelled_at && promise.status !== "CANCELLED" && Number(promise.remaining_amount) > 0;
const explanations: Record<string, string> = {
  pending: "The promised date is today or later, and an amount is still unpaid.",
  broken: "The promised date has passed and an amount is still unpaid, even if a partial payment was made.",
  kept: "Recorded payments fully cover this promise. No payment remains due.",
  cancelled: "This commitment was cancelled. Its history and existing payments are retained.",
};

export function PromisesPage() {
  const { promises } = useLoaderData<typeof promisesLoader>();
  const [params] = useSearchParams();
  const rawStatus = params.get("status");
  const statusFilter = rawStatus && ["pending", "broken", "kept", "cancelled"].includes(rawStatus) ? rawStatus : "all";
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const mutation = useFetcher<typeof promisesAction>();
  const pending = mutation.state !== "idle";
  const selected = promises.find((promise) => promise.id === selectedId);
  const filtered = promises.filter((promise) =>
    (statusFilter === "all" || promiseStatusInfo(promise.status).key === statusFilter) &&
    `${promise.customer_name} ${promise.note ?? ""} ${promise.id}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const outstanding = promises.filter((item) => item.status !== "CANCELLED")
    .reduce((total, item) => total + Number(item.remaining_amount), 0);
  const count = (key: string) => promises.filter((item) => promiseStatusInfo(item.status).key === key).length;

  function closeAll() {
    if (pending) return;
    setSelectedId(null); setConfirmingCancel(false); setCancelReason("");
  }
  useEffect(() => {
    if (mutation.state === "idle" && mutation.data?.ok) {
      setSelectedId(null); setConfirmingCancel(false); setCancelReason("");
    }
  }, [mutation.state, mutation.data]);

  return <section className="promise-workspace flex min-w-0 flex-col gap-6 font-quest-body text-quest-text">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 font-quest-mono text-xs tracking-widest text-quest-accent-border">COLLECTIONS</p>
        <h1 className="font-quest-heading text-[32px] leading-tight">Payment promises</h1>
        <p className="mt-2 text-sm text-quest-muted">Track what customers agreed to pay, what they have paid, and what remains.</p></div>
      <Link to="/promises/new" className="promise-primary">+ Add promise</Link>
    </header>
    <SaveFeedback />
    {mutation.data?.ok && <p className="promise-success" role="status">{mutation.data.message}</p>}
    <details open className="rounded-quest border border-quest-accent-border-soft bg-quest-surface p-5">
      <summary className="cursor-pointer font-quest-heading text-base text-quest-accent-border">How do statuses change?</summary>
      <p className="mt-3 text-sm leading-relaxed text-quest-text">Record a payment to reduce the remaining balance. When it reaches $0.00, the promise becomes Completed automatically. Broken means the promised date has passed while money is still owed. Dates use Beirut time.</p>
      <dl className="promise-guide mt-4 grid gap-4">
        {[["PENDING", "pending"], ["BROKEN", "broken"], ["KEPT", "kept"], ["CANCELLED", "cancelled"]].map(([status, key]) =>
          <div key={key}><dt><StatusBadge status={status} label={promiseStatusInfo(status).label} /></dt>
            <dd className="mt-2 text-sm leading-relaxed text-quest-muted">{explanations[key]}</dd></div>)}
      </dl>
    </details>
    <div className="promise-metrics grid gap-3">
      <article><span>Remaining to collect</span><strong>{money(outstanding)}</strong><small>Excludes cancelled promises</small></article>
      <article><span>Pending</span><strong>{count("pending")}</strong><small>Not yet past the promised date</small></article>
      <article><span>Broken / past due</span><strong>{count("broken")}</strong><small>Unpaid after the promised date</small></article>
      <article><span>Completed</span><strong>{count("kept")}</strong><small>Fully covered by payments</small></article>
    </div>
    <div className="promise-panel rounded-quest border border-quest-border bg-quest-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-quest-border pb-4">
        <div><h2 className="font-quest-heading text-lg">Promises</h2><p className="mt-1 text-xs text-quest-muted">{filtered.length} of {promises.length} promises shown</p></div>
        <div className="promise-filters flex flex-wrap items-center gap-3">
          <input className="promise-search" type="search" aria-label="Search promises" placeholder="Customer, note, or promise number" value={search} onChange={(event) => setSearch(event.target.value)} />
          <ListFilter name="status" label="Show" defaultValue="all" options={[
            {value:"all",label:"All promises"},{value:"pending",label:"Pending"},{value:"broken",label:"Broken"},
            {value:"kept",label:"Completed"},{value:"cancelled",label:"Cancelled"},
          ]} />
        </div>
      </div>
      {statusFilter !== "all" && <p className="border-b border-quest-border py-3 text-sm text-quest-muted" role="note">{explanations[statusFilter]}</p>}
      <div className="promise-head" aria-hidden="true"><span>Customer / promise</span><span>Promised / paid</span><span>Remaining</span><span>Promised date</span><span>Status</span><span>Next step</span></div>
      <div className="promise-list">
        {filtered.map((promise) => {
          const info = promiseStatusInfo(promise.status);
          return <article className="promise-item" key={promise.id}>
            <div><Link to={`/customers/${promise.customer_id}`} className="promise-customer-link">{promise.customer_name}</Link>
              <p className="mt-1 text-xs text-quest-muted">Promise #{promise.id} / Receivable #{promise.receivable}</p>
              {promise.note && <p className="mt-2 whitespace-pre-wrap text-sm text-quest-muted">{promise.note}</p>}</div>
            <div><span className="promise-cell-label">Promised / paid</span><strong>{money(promise.amount)}</strong><p className="mt-1 text-xs text-quest-muted">Paid {money(promise.paid_amount)}</p></div>
            <div><span className="promise-cell-label">Remaining</span><strong>{money(promise.remaining_amount)}</strong></div>
            <div><span className="promise-cell-label">Promised date</span><time dateTime={promise.promised_on}>{displayDate(promise.promised_on)}</time></div>
            <div><StatusBadge status={promise.status} label={info.label} />{info.key === "broken" && <p className="mt-2 text-xs text-quest-muted">Past due and still unpaid</p>}</div>
            <div className="promise-item-actions">
              {(promise.receivable_archived_at || promise.customer_archived_at) && <p className="text-sm text-quest-muted">Restore the customer and receivable before recording activity.</p>}
              {canPay(promise) && <Link className="promise-primary" to={paymentLink(promise)}>Record payment</Link>}
              <button type="button" className="promise-secondary" onClick={() => setSelectedId(promise.id)}>View details</button>
            </div>
          </article>;
        })}
        {filtered.length === 0 && <div className="py-10 text-center"><h3 className="font-quest-heading">No promises found</h3><p className="mt-2 text-sm text-quest-muted">{promises.length ? "Try another search or status filter." : "Add a promise after agreeing on a payment amount and date with a customer."}</p></div>}
      </div>
    </div>
    {selected && !confirmingCancel && <EntityModal title="Payment promise details" description={`Promise #${selected.id} for ${selected.customer_name}, due ${displayDate(selected.promised_on)}.`} onClose={closeAll}>
      <div className="entity-modal-details">
        <div><span>Customer</span><strong>{selected.customer_name}</strong></div>
        <div><span>Promised amount</span><strong>{money(selected.amount)}</strong></div>
        <div><span>Paid so far</span><strong>{money(selected.paid_amount)}</strong></div>
        <div><span>Remaining</span><strong>{money(selected.remaining_amount)}</strong></div>
        <div><span>Promised date</span><strong>{displayDate(selected.promised_on)}</strong></div>
        <div><span>Status</span><StatusBadge status={selected.status} label={promiseStatusInfo(selected.status).label} /></div>
        <div><span>Note</span><strong>{selected.note || "No note"}</strong></div>
        {selected.cancelled_at && <div><span>Cancellation reason</span><strong>{selected.cancel_reason || "No reason recorded"}</strong></div>}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-quest-muted">{explanations[promiseStatusInfo(selected.status).key]}
        {canPay(selected) && " Record the money received to update the balance. Change the promised date only if the customer agrees to a new date."}</p>
      <div className="entity-modal-actions">
        <button type="button" className="promise-secondary" onClick={closeAll}>Close</button>
        {canPay(selected) && <Link className="promise-primary" to={paymentLink(selected)}>Record payment</Link>}
        {!selected.cancelled_at && !selected.receivable_archived_at && !selected.customer_archived_at && <Link className="promise-secondary" to={`/promises/${selected.id}/edit`}>Edit promise</Link>}
        {canPay(selected) && <button type="button" className="promise-danger" onClick={() => {setCancelReason("");setConfirmingCancel(true);}}>Cancel promise</button>}
      </div>
    </EntityModal>}
    {selected && confirmingCancel && <EntityModal title="Cancel payment promise?" description={`Cancel promise #${selected.id} for ${selected.customer_name}? Cancellation is permanent; existing payments still count toward the receivable.`} onClose={() => { if (!pending) setConfirmingCancel(false); }}>
      <mutation.Form method="post" action="/promises">
        <input type="hidden" name="intent" value="cancel" /><input type="hidden" name="id" value={selected.id} />
        <label className="mb-2 block text-sm" htmlFor="cancel-reason">Cancellation reason</label>
        <textarea id="cancel-reason" name="cancel_reason" rows={3} minLength={3} required className="promise-reason" value={cancelReason} disabled={pending} onChange={(event) => setCancelReason(event.target.value)} />
        {mutation.data && !mutation.data.ok && <p className="mt-3 text-sm text-quest-danger-text" role="alert">{mutation.data.message}</p>}
        <div className="entity-modal-actions"><button type="button" className="promise-secondary" disabled={pending} onClick={() => setConfirmingCancel(false)}>Back</button>
          <button type="submit" className="promise-danger" disabled={pending || cancelReason.trim().length < 3}>{pending ? "Cancelling..." : "Cancel promise"}</button></div>
      </mutation.Form>
    </EntityModal>}
  </section>;
}
