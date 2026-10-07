import { Link } from "react-router";
import { useState } from "react";
import { EntityModal } from "../components/EntityModal";
import {
  deleteReceivable,
  getReceivables,
  type Receivable,
} from "../data/receivables";
import { SaveFeedback } from "../components/SaveFeedback";

export function ReceivablesPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [receivables, setReceivables] = useState(getReceivables);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const filteredReceivables = statusFilter === "all"
    ? receivables
    : receivables.filter((receivable) => {
      switch (statusFilter) {
        case "outstanding":
          return receivable.status === "Outstanding";
        case "partial":
          return receivable.status === "Partially paid";
        case "paid":
          return receivable.status === "Paid";
        default:
          return true;
      }
    });
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  const displayDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const totalReceivables = receivables.reduce((total, item) => total + item.originalAmount, 0);
  const outstandingTotal = receivables.reduce((total, item) => total + item.outstanding, 0);
  const refreshReceivables = () => setReceivables(getReceivables());

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
          <strong>{formatCurrency(totalReceivables - outstandingTotal)}</strong>
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
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="receivable-list">
          {filteredReceivables.map((receivable) => (
            <div
              className="receivable-row"
              key={receivable.id}
            >
              <div className="receivable-customer">
                <div className="customer-avatar">
                  {receivable.customer.charAt(0)}
                </div>

                <div>
                  <Link
                    to={`/customers/${receivable.customerId}`}
                    className="customer-name-link"
                  >
                    {receivable.customer}
                  </Link>

                  <span>{receivable.description}</span>
                </div>
              </div>

              <div className="receivable-amount">
                <span>Original</span>
                <strong>{formatCurrency(receivable.originalAmount)}</strong>
              </div>

              <div className="receivable-amount">
                <span>Outstanding</span>
                <strong>{formatCurrency(receivable.outstanding)}</strong>
              </div>

              <div className="receivable-due">
                <span>Due date</span>
                <strong>{displayDate(receivable.dueDate)}</strong>
              </div>

              <span
                className={`status-badge ${
                  receivable.status === "Paid"
                    ? "paid"
                    : receivable.status === "Outstanding"
                      ? "outstanding"
                      : "partial"
                }`}
              >
                {receivable.status}
              </span>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedReceivable(receivable)}
              >
                View
              </button>
            </div>
          ))}
          {filteredReceivables.length === 0 && (
            <div className="customer-empty">
              <strong>No receivables found</strong>
              <p>No receivables match the selected status.</p>
            </div>
          )}
        </div>
      </div>

      {selectedReceivable && !confirmingDelete && (
        <EntityModal
          title="Receivable details"
          description={`${selectedReceivable.description} for ${selectedReceivable.customer}.`}
          onClose={() => setSelectedReceivable(null)}
        >
          <div className="entity-modal-details">
            <div><span>Customer</span><strong>{selectedReceivable.customer}</strong></div>
            <div><span>Description</span><strong>{selectedReceivable.description}</strong></div>
            <div><span>Original amount</span><strong>{formatCurrency(selectedReceivable.originalAmount)}</strong></div>
            <div><span>Outstanding</span><strong>{formatCurrency(selectedReceivable.outstanding)}</strong></div>
            <div><span>Due date</span><strong>{displayDate(selectedReceivable.dueDate)}</strong></div>
            <div><span>Status</span><strong>{selectedReceivable.status}</strong></div>
          </div>
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedReceivable(null)}
            >
              Close
            </button>
            <Link
              to={`/receivables/${selectedReceivable.id}/edit`}
              className="secondary-button"
              onClick={() => setSelectedReceivable(null)}
            >
              Edit receivable
            </Link>
            <button
              type="button"
              className="danger-button"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete receivable
            </button>
          </div>
        </EntityModal>
      )}

      {selectedReceivable && confirmingDelete && (
        <EntityModal
          title="Delete receivable?"
          description={`Are you sure you want to delete ${selectedReceivable.description} for ${selectedReceivable.customer}? This action cannot be undone.`}
          onClose={() => setConfirmingDelete(false)}
        >
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                deleteReceivable(selectedReceivable.id);
                refreshReceivables();
                setConfirmingDelete(false);
                setSelectedReceivable(null);
              }}
            >
              Delete receivable
            </button>
          </div>
        </EntityModal>
      )}
    </section>
  );
}