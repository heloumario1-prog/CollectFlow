import { Link } from "react-router";
import { useEffect, useState } from "react";
import { EntityModal } from "../components/EntityModal";
import {
  archiveReceivableById,
  listReceivables,
  statusInfo,
  type ApiReceivable,
} from "../data/receivables";
import { SaveFeedback } from "../components/SaveFeedback";

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(amount));

const displayDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function ReceivablesPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [receivables, setReceivables] = useState<ApiReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ApiReceivable | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    let active = true;
    listReceivables()
      .then((data) => {
        if (active) setReceivables(data);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Could not load receivables.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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

  async function handleArchive() {
    if (!selected) return;
    setArchiving(true);
    setArchiveError("");
    try {
      await archiveReceivableById(selected.id);
      setReceivables((current) =>
        current.filter((item) => item.id !== selected.id),
      );
      setConfirmingArchive(false);
      setSelected(null);
    } catch (e) {
      setArchiveError(
        e instanceof Error ? e.message : "Could not archive the receivable.",
      );
    } finally {
      setArchiving(false);
    }
  }

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

          <select
            className="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="outstanding">Outstanding</option>
            <option value="partial">Partially paid</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="receivable-list">
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: "#b42318", fontSize: 12 }}>{error}</p>}

          {!loading &&
            filteredReceivables.map((receivable) => {
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

                  <span className={`status-badge ${info.className}`}>
                    {info.label}
                  </span>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSelected(receivable)}
                  >
                    View
                  </button>
                </div>
              );
            })}

          {!loading && !error && filteredReceivables.length === 0 && (
            <div className="customer-empty">
              <strong>No receivables found</strong>
              <p>
                {receivables.length === 0
                  ? "Add your first receivable to get started."
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
          <div className="entity-modal-details">
            <div><span>Customer</span><strong>{selected.customer_detail.name}</strong></div>
            <div><span>Reference</span><strong>{selected.reference || "—"}</strong></div>
            <div><span>Description</span><strong>{selected.description || "—"}</strong></div>
            <div><span>Original amount</span><strong>{formatCurrency(selected.original_amount)}</strong></div>
            <div><span>Paid</span><strong>{formatCurrency(selected.paid_amount)}</strong></div>
            <div><span>Outstanding</span><strong>{formatCurrency(selected.remaining_amount)}</strong></div>
            <div><span>Issue date</span><strong>{displayDate(selected.issue_date)}</strong></div>
            <div><span>Due date</span><strong>{displayDate(selected.due_date)}</strong></div>
            <div><span>Status</span><strong>{statusInfo(selected.status).label}</strong></div>
          </div>
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
            <Link
              to={`/receivables/${selected.id}/edit`}
              className="secondary-button"
              onClick={() => setSelected(null)}
            >
              Edit receivable
            </Link>
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                setArchiveError("");
                setConfirmingArchive(true);
              }}
            >
              Archive receivable
            </button>
          </div>
        </EntityModal>
      )}

      {selected && confirmingArchive && (
        <EntityModal
          title="Archive receivable?"
          description={`Archive ${selected.description || "this receivable"} for ${selected.customer_detail.name}? It will be hidden from the list. A receivable with an unpaid balance and existing promises or payments cannot be archived.`}
          onClose={() => setConfirmingArchive(false)}
        >
          {archiveError && (
            <p style={{ color: "#b42318", fontSize: 12 }}>{archiveError}</p>
          )}
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setConfirmingArchive(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleArchive}
              disabled={archiving}
            >
              {archiving ? "Archiving..." : "Archive receivable"}
            </button>
          </div>
        </EntityModal>
      )}
    </section>
  );
}