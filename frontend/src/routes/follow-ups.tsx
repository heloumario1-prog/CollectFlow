import { useEffect, useRef, useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { EntityModal } from "../components/EntityModal";
import { SaveFeedback } from "../components/SaveFeedback";
import { StatusBadge } from "../components/StatusBadge";
import type { FollowUp } from "../data/follow-ups";
import type { followUpsLoader } from "../screens/follow-ups/loader";
import type { followUpsAction } from "../screens/follow-ups/action";
import "../css/follow-ups.css";

const displayDate = (value: string) => new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Beirut", month: "short", day: "numeric", year: "numeric",
  hour: "numeric", minute: "2-digit",
}).format(new Date(value));

export function FollowUpsPage() {
  const { followUps } = useLoaderData<typeof followUpsLoader>();
  const mutation = useFetcher<typeof followUpsAction>();
  const resultBeforeDelete = useRef(mutation.data);
  const pending = mutation.state !== "idle";
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<FollowUp | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = followUps.find((item) => item.id === selectedId);
  const filtered = followUps.filter((item) =>
    `${item.customer} ${item.notes} ${item.receivable}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const completed = followUps.filter((item) => item.completedAt).length;
  const linked = followUps.filter((item) => item.receivableId !== null).length;

  useEffect(() => {
    if (mutation.state === "idle" && mutation.data?.ok && mutation.data.intent === "delete") {
      setDeleting(null);
      setSelectedId(null);
      heading.current?.focus();
    }
  }, [mutation.state, mutation.data]);

  return <section className="content-page follow-ups-page">
    <div className="page-header-row">
      <div><p className="eyebrow">FOLLOW-UPS</p><h1 ref={heading} tabIndex={-1}>Follow-ups</h1>
        <p className="page-description">Record, complete, and review customer collection contacts.</p></div>
      <Link to="/follow-ups/new" className="primary-button">+ Record follow-up</Link>
    </div>
    <SaveFeedback />
    {mutation.data && <p className={mutation.data.ok ? "follow-up-success" : "follow-up-error"}
      role={mutation.data.ok ? "status" : "alert"}>{mutation.data.message}</p>}
    <div className="follow-up-summary">
      <article className="stat-card"><span>Total contacts</span><strong>{followUps.length}</strong><small>Contacts in this list</small></article>
      <article className="stat-card"><span>Completed</span><strong>{completed}</strong><small>Marked completed</small></article>
      <article className="stat-card"><span>Pending</span><strong>{followUps.length - completed}</strong><small>Not yet marked completed</small></article>
      <article className="stat-card"><span>Linked to receivables</span><strong>{linked}</strong><small>Contacts linked to a receivable</small></article>
    </div>
    <div className="content-panel follow-ups-panel" aria-busy={pending}>
      <div className="follow-ups-toolbar">
        <div className="follow-ups-toolbar-title"><strong>Follow-up history</strong><span>{filtered.length} records shown</span></div>
        <input className="customer-search" type="search" placeholder="Search customers, notes, or receivables..."
          aria-label="Search follow-ups" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="follow-up-table-header" aria-hidden="true">
        <span>Customer</span><span>Receivable</span><span>Contact date</span><span>Notes</span><span>Status</span><span>Actions</span>
      </div>
      <div className="follow-up-list">
        {filtered.map((item) => <article className="follow-up-row" key={item.id}>
          <div className="follow-up-customer"><span className="follow-up-cell-label">Customer</span>
            <Link to={`/customers/${item.customerId}`} className="customer-name-link">{item.customer}</Link></div>
          <div className="follow-up-cell"><span className="follow-up-cell-label">Receivable</span><strong>{item.receivable}</strong></div>
          <div className="follow-up-cell"><span className="follow-up-cell-label">Contact date</span><time dateTime={item.date}>{displayDate(item.date)}</time></div>
          <div className="follow-up-cell follow-up-notes"><span className="follow-up-cell-label">Notes</span><p>{item.notes || "No notes"}</p></div>
          <div className="follow-up-cell"><span className="follow-up-cell-label">Status</span><StatusBadge status={item.completedAt ? "Completed" : "Pending"} /></div>
          <div className="follow-up-actions">
            <button type="button" className="secondary-button" onClick={() => setSelectedId(item.id)}>View</button>
            <Link to={`/follow-ups/${item.id}/edit`} className="secondary-button">Edit</Link>
            {!item.completedAt && <mutation.Form method="post" action="/follow-ups">
              <input type="hidden" name="id" value={item.id} /><input type="hidden" name="intent" value="complete" />
              <button className="secondary-button" type="submit" disabled={pending}>
                {pending && mutation.formData?.get("id") === String(item.id) && mutation.formData?.get("intent") === "complete" ? "Completing..." : "Mark completed"}
              </button>
            </mutation.Form>}
            <button type="button" className="danger-button" disabled={pending} onClick={() => { resultBeforeDelete.current = mutation.data; setDeleting(item); }}
              aria-label={`Delete follow-up for ${item.customer}`}>Delete follow-up</button>
          </div>
        </article>)}
        {filtered.length === 0 && <div className="customer-empty"><strong>No follow-ups found</strong>
          <p>{search ? "Try another customer, note, or receivable." : "Record a follow-up to start your history."}</p></div>}
      </div>
    </div>
    {selected && !deleting && <EntityModal title="Follow-up details" description={`${selected.customer} - ${displayDate(selected.date)}`} onClose={() => setSelectedId(null)}>
      <div className="entity-modal-details">
        <div><span>Customer</span><strong>{selected.customer}</strong></div>
        <div><span>Receivable</span><strong>{selected.receivable}</strong></div>
        <div><span>Contact date</span><strong>{displayDate(selected.date)}</strong></div>
        <div><span>Recorded by</span><strong>{selected.createdBy || "Unknown"}</strong></div>
        <div><span>Notes</span><strong>{selected.notes || "No notes"}</strong></div>
        <div><span>Status</span><StatusBadge status={selected.completedAt ? "Completed" : "Pending"} /></div>
      </div>
      <div className="entity-modal-actions"><button type="button" className="secondary-button" onClick={() => setSelectedId(null)}>Close</button>
        <Link to={`/follow-ups/${selected.id}/edit`} className="primary-button">Edit</Link></div>
    </EntityModal>}
    {deleting && <EntityModal title="Delete follow-up?" description={`Remove the follow-up for ${deleting.customer}, recorded ${displayDate(deleting.date)}? The record and its history will be retained, but it will no longer appear in this list.`}
      onClose={() => { if (!pending) setDeleting(null); }}>
      <p className="follow-up-delete-note">{deleting.notes || "No notes"}</p>
      {!pending && mutation.data && mutation.data !== resultBeforeDelete.current && !mutation.data.ok && <p role="alert">{mutation.data.message}</p>}
      <div className="entity-modal-actions">
        <button type="button" className="secondary-button" disabled={pending} onClick={() => setDeleting(null)}>Cancel</button>
        <mutation.Form method="post" action="/follow-ups">
          <input type="hidden" name="id" value={deleting.id} /><input type="hidden" name="intent" value="delete" />
          <button type="submit" className="danger-button" disabled={pending}>{pending ? "Deleting..." : "Delete follow-up"}</button>
        </mutation.Form>
      </div>
    </EntityModal>}
  </section>;
}
