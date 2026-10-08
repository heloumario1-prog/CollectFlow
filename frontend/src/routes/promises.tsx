import { useState } from "react";
import { Link } from "react-router";
import { EntityModal } from "../components/EntityModal";
import { SaveFeedback } from "../components/SaveFeedback";
import { deletePromise, getPromises, type PaymentPromise } from "../data/promises";

export function PromisesPage() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [promises, setPromises] = useState(getPromises);
  const [selectedPromise, setSelectedPromise] = useState<PaymentPromise | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const refreshPromises = () => setPromises(getPromises());

  const filteredPromises =
    statusFilter === "All"
      ? promises
      : promises.filter((promise) => promise.status === statusFilter);

  const totalPromised = promises.reduce((total, promise) => total + promise.amount, 0);
  const upcomingCount = promises.filter((promise) => promise.status === "Upcoming").length;
  const overdueCount = promises.filter((promise) => promise.status === "Overdue").length;

  return (
    <section className="content-page">
      <div className="page-header-row">
        <div>
          <p className="eyebrow">PROMISES</p>
          <h1>Payment promises</h1>
          <p className="page-description">
            Track customer payment commitments and their promised dates.
          </p>
        </div>

        <Link to="/promises/new" className="primary-button">
          + Add promise
        </Link>
      </div>

      <SaveFeedback />

      <div className="promise-summary">
        <article className="stat-card">
          <span>Total promised</span>
          <strong>{formatCurrency(totalPromised)}</strong>
          <small>Across active promises</small>
        </article>

        <article className="stat-card">
          <span>Upcoming</span>
          <strong>{upcomingCount}</strong>
          <small>Promises still expected</small>
        </article>

        <article className="stat-card">
          <span>Overdue</span>
          <strong>{overdueCount}</strong>
          <small>Requires attention</small>
        </article>
      </div>

      <div className="content-panel promises-panel">
        <div className="promises-toolbar">
          <div>
            <strong>Payment promises</strong>
            <span>{filteredPromises.length} promises shown</span>
          </div>

          <select
            className="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        <div className="promise-list">
          {filteredPromises.map((promise) => (
            <div className="promise-row" key={promise.id}>
              <div className="promise-customer">
                <div className="customer-avatar">
                  {promise.customer.charAt(0)}
                </div>

                <div>
                  <Link
                    to={`/customers/${promise.customerId}`}
                    className="customer-name-link"
                  >
                    {promise.customer}
                  </Link>

                  <span>Payment commitment</span>
                </div>
              </div>

              <div className="promise-info">
                <span>Promised amount</span>
                <strong>{formatCurrency(promise.amount)}</strong>
              </div>

              <div className="promise-info">
                <span>Promise date</span>
                <strong>{formatDate(promise.promiseDate)}</strong>
              </div>

              <span
                className={
                  promise.status === "Overdue"
                    ? "promise-status overdue"
                    : "promise-status upcoming"
                }
              >
                {promise.status}
              </span>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedPromise(promise)}
              >
                View
              </button>
            </div>
          ))}

          {filteredPromises.length === 0 && (
            <div className="customer-empty">
              <strong>No promises found</strong>
              <p>No payment promises match the selected status.</p>
            </div>
          )}
        </div>
      </div>

      {selectedPromise && !confirmingDelete && (
        <EntityModal
          title="Payment promise details"
          description={`${selectedPromise.customer} promised ${formatCurrency(selectedPromise.amount)} by ${formatDate(selectedPromise.promiseDate)}.`}
          onClose={() => setSelectedPromise(null)}
        >
          <div className="entity-modal-details">
            <div><span>Customer</span><strong>{selectedPromise.customer}</strong></div>
            <div><span>Promised amount</span><strong>{formatCurrency(selectedPromise.amount)}</strong></div>
            <div><span>Promise date</span><strong>{formatDate(selectedPromise.promiseDate)}</strong></div>
            <div><span>Status</span><strong>{selectedPromise.status}</strong></div>
          </div>
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedPromise(null)}
            >
              Close
            </button>
            <Link
              to={`/promises/${selectedPromise.id}/edit`}
              className="secondary-button"
              onClick={() => setSelectedPromise(null)}
            >
              Edit promise
            </Link>
            <button
              type="button"
              className="danger-button"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete promise
            </button>
          </div>
        </EntityModal>
      )}

      {selectedPromise && confirmingDelete && (
        <EntityModal
          title="Delete payment promise?"
          description={`Delete ${selectedPromise.customer}'s promise of ${formatCurrency(selectedPromise.amount)} due ${formatDate(selectedPromise.promiseDate)}? This action cannot be undone.`}
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
                deletePromise(selectedPromise.id);
                refreshPromises();
                setConfirmingDelete(false);
                setSelectedPromise(null);
              }}
            >
              Delete promise
            </button>
          </div>
        </EntityModal>
      )}
    </section>
  );
}