import { StatusBadge } from "../components/StatusBadge";
import { Link, useFetcher, useLoaderData, useSearchParams } from "react-router";
import { ListFilter } from "../components/ListFilter";
import type { receivablesLoader } from "../screens/receivables/loader";
import type { receivablesAction } from "../screens/receivables/action";
import { useEffect, useState } from "react";
import { EntityModal } from "../components/EntityModal";
import {
  statusInfo,
  type ApiReceivable,
} from "../data/receivables";
import { SaveFeedback } from "../components/SaveFeedback";

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));

const displayDate = (date: string | null) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) : "Not specified";

export function ReceivablesPage() {
  const [params] = useSearchParams();
  const rawStatus = params.get("status");
  const statusFilter = ["outstanding", "partial", "overdue", "paid"].includes(rawStatus ?? "") ? rawStatus : "all";
  const { receivables, archive } = useLoaderData<typeof receivablesLoader>();
  const lifecycle = useFetcher<typeof receivablesAction>();
  const pending = lifecycle.state !== "idle";
  const [selected, setSelected] = useState<ApiReceivable | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  useEffect(() => {
    if (lifecycle.state === "idle" && lifecycle.data && "message" in lifecycle.data) {
      setSelected(null);
      setConfirmingArchive(false);
    }
  }, [lifecycle.state, lifecycle.data]);

  const filteredReceivables =
    statusFilter === "all"
      ? receivables
      : receivables.filter(
          (receivable) => statusInfo(receivable.status).key === statusFilter,
        );

  const totalReceivables = receivables.reduce(
    (total, item) => total + Number(item.original_amount),
    0,
  );
  const outstandingTotal = receivables.reduce(
    (total, item) => total + Number(item.remaining_amount),
    0,
  );
  const collectedTotal = receivables.reduce(
    (total, item) => total + Number(item.paid_amount),
    0,
  );

  return (
    <section className="content-page">
      <div className="page-header-row">
        <div>
          <p className="eyebrow">RECEIVABLES</p>
          <h1>Receivables</h1>
          <p className="page-description">
            Track outstanding customer balances and payment due dates.
          </p>
        </div>

        <Link to="/receivables/new" className="primary-button">
          + Add receivable
        </Link>
      </div>

      <SaveFeedback />
      {lifecycle.data && "message" in lifecycle.data && <p role="status" className="save-feedback">{lifecycle.data.message}</p>}
      {lifecycle.data && "error" in lifecycle.data && <p role="alert">{lifecycle.data.error}</p>}

      <div className="receivable-summary">
        <article className="stat-card">
          <span>Total receivables</span>
          <strong>{formatCurrency(totalReceivables)}</strong>
          <small>Original amounts</small>
        </article>

        <article className="stat-card">
          <span>Outstanding</span>
          <strong>{formatCurrency(outstandingTotal)}</strong>
          <small>Remaining balance</small>
        </article>

        <article className="stat-card">
          <span>Collected</span>
          <strong>{formatCurrency(collectedTotal)}</strong>
          <small>Amount already paid</small>
        </article>
      </div>

      <div className="content-panel receivables-panel">
        <div className="receivables-toolbar">
          <div>
            <strong>Receivable list</strong>
            <span>{filteredReceivables.length} receivables shown</span>
          </div>

          <ListFilter name="archive" label="Show" defaultValue="active" options={[
            { value: "active", label: "Active receivables" },
            { value: "archived", label: "Archived receivables" },
            { value: "all", label: "All receivables" },
          ]} />
          <ListFilter name="status" label="Balance status" defaultValue="all" options={[
            { value: "all", label: "All statuses" },
            { value: "outstanding", label: "Open" },
            { value: "partial", label: "Partially paid" },
            { value: "overdue", label: "Overdue" },
            { value: "paid", label: "Paid" },
          ]} />
        </div>

        <div className="receivable-list">
          {filteredReceivables.map((receivable) => {
              const info = statusInfo(receivable.status);
              return (
                <div className="receivable-row" key={receivable.id}>
                  <div className="receivable-customer">
                    <div className="customer-avatar">
                      {receivable.customer_detail.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <Link
                        to={`/customers/${receivable.customer_detail.id}`}
                        className="customer-name-link"
                      >
                        {receivable.customer_detail.name}
                      </Link>

                      <span>{receivable.description || receivable.reference || "—"}</span>
                    </div>
                  </div>

                  <div className="receivable-amount">
                    <span>Original</span>
                    <strong>{formatCurrency(receivable.original_amount)}</strong>
                  </div>

                  <div className="receivable-amount">
                    <span>Outstanding</span>
                    <strong>{formatCurrency(receivable.remaining_amount)}</strong>
                  </div>

                  <div className="receivable-due">
                    <span>Due date</span>
                    <strong>{displayDate(receivable.due_date)}</strong>
                  </div>

                  <StatusBadge status={receivable.archived_at ? "Archived" : receivable.status} label={receivable.archived_at ? "Archived" : info.label} />

                  <div className="record-row-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSelected(receivable)}
                  >
                    View
                  </button>
                  {receivable.archived_at && (
                    <lifecycle.Form method="post">
                      <input type="hidden" name="intent" value="restore" />
                      <input type="hidden" name="id" value={receivable.id} />
                      <button type="submit" className="secondary-button" disabled={pending}
                        aria-label={`Restore receivable ${receivable.id}`}>
                        {pending && lifecycle.formData?.get("id") === String(receivable.id) ? "Restoring..." : "Restore"}
                      </button>
                    </lifecycle.Form>
                  )}
                  </div>
                </div>
              );
            })}

          {filteredReceivables.length === 0 && (
            <div className="customer-empty">
              <strong>No receivables found</strong>
              <p>
                {receivables.length === 0
                  ? archive === "archived" ? "No archived receivables. Archived records appear here and can be restored." : "No receivables in this view. Add one or choose another filter."
                  : "No receivables match the selected status."}
              </p>
            </div>
          )}
        </div>
      </div>

      {selected && !confirmingArchive && (
        <EntityModal
          title="Receivable details"
          description={`${selected.description || "Receivable"} for ${selected.customer_detail.name}.`}
          onClose={() => setSelected(null)}
        >
          {lifecycle.data && "error" in lifecycle.data && <p role="alert">{lifecycle.data.error}</p>}
          <div className="entity-modal-details">
            <div><span>Customer</span><strong>{selected.customer_detail.name}</strong></div>
            <div><span>Reference</span><strong>{selected.reference || "—"}</strong></div>
            <div><span>Description</span><strong>{selected.description || "—"}</strong></div>
            <div><span>Original amount</span><strong>{formatCurrency(selected.original_amount)}</strong></div>
            <div><span>Paid</span><strong>{formatCurrency(selected.paid_amount)}</strong></div>
            <div><span>Outstanding</span><strong>{formatCurrency(selected.remaining_amount)}</strong></div>
            <div><span>Issue date</span><strong>{displayDate(selected.issue_date)}</strong></div>
            <div><span>Due date</span><strong>{displayDate(selected.due_date)}</strong></div>
            <div><span>Status</span><StatusBadge status={selected.archived_at ? "Archived" : selected.status} label={selected.archived_at ? "Archived" : statusInfo(selected.status).label} /></div>
          </div>
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
            {selected.archived_at ? (
              <lifecycle.Form method="post">
                <input type="hidden" name="intent" value="restore" />
                <input type="hidden" name="id" value={selected.id} />
                <button className="primary-button" type="submit" disabled={pending}>
                  {pending ? "Restoring..." : "Restore receivable"}
                </button>
              </lifecycle.Form>
            ) : <>
              <Link to={`/receivables/${selected.id}/edit`} className="secondary-button" onClick={() => setSelected(null)}>
                Edit receivable
              </Link>
              <button type="button" className="danger-button" onClick={() => setConfirmingArchive(true)}>
                Archive receivable
              </button>
            </>}
          </div>
        </EntityModal>
      )}

      {selected && confirmingArchive && (
        <EntityModal
          title="Archive receivable?"
          description={`Archive ${selected.description || "this receivable"} for ${selected.customer_detail.name}? Find it later under Show: Archived receivables. A receivable with an unpaid balance and existing promises or payments cannot be archived.`}
          onClose={() => { if (!pending) setConfirmingArchive(false); }}
        >
          {lifecycle.data && "error" in lifecycle.data && <p role="alert">{lifecycle.data.error}</p>}
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={pending}
              onClick={() => setConfirmingArchive(false)}
            >
              Cancel
            </button>
            <lifecycle.Form method="post">
              <input type="hidden" name="intent" value="archive" />
              <input type="hidden" name="id" value={selected.id} />
              <button type="submit" className="danger-button" disabled={pending}>
                {pending ? "Archiving..." : "Archive receivable"}
              </button>
            </lifecycle.Form>
          </div>
        </EntityModal>
      )}
    </section>
  );
}
