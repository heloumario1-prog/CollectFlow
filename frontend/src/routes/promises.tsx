import { useEffect, useState } from "react";
import { Link } from "react-router";
import { EntityModal } from "../components/EntityModal";
import { SaveFeedback } from "../components/SaveFeedback";
import {
  cancelPromiseById,
  listPromises,
  promiseStatusInfo,
  type ApiPromise,
} from "../data/promises";

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(amount));

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function PromisesPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [promises, setPromises] = useState<ApiPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<ApiPromise | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    listPromises()
      .then((data) => {
        if (active) setPromises(data);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Could not load promises.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const filteredPromises =
    statusFilter === "all"
      ? promises
      : promises.filter(
          (promise) => promiseStatusInfo(promise.status).key === statusFilter,
        );

  const activePromises = promises.filter(
    (promise) => promiseStatusInfo(promise.status).key !== "cancelled",
  );
  const totalPromised = activePromises.reduce(
    (total, promise) => total + Number(promise.amount),
    0,
  );
  const pendingCount = promises.filter(
    (promise) => promiseStatusInfo(promise.status).key === "pending",
  ).length;
  const brokenCount = promises.filter(
    (promise) => promiseStatusInfo(promise.status).key === "broken",
  ).length;

  function closeAll() {
    setSelected(null);
    setConfirmingCancel(false);
    setCancelReason("");
    setCancelError("");
  }

  async function handleCancel() {
    if (!selected) return;
    if (cancelReason.trim().length < 3) {
      setCancelError("Please enter a reason (at least 3 characters).");
      return;
    }
    setCancelling(true);
    setCancelError("");
    try {
      await cancelPromiseById(selected.id, cancelReason);
      closeAll();
      setRefreshKey((key) => key + 1);
    } catch (e) {
      setCancelError(
        e instanceof Error ? e.message : "Could not cancel the promise.",
      );
    } finally {
      setCancelling(false);
    }
  }

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
          <span>Pending</span>
          <strong>{pendingCount}</strong>
          <small>Promises still expected</small>
        </article>

        <article className="stat-card">
          <span>Broken</span>
          <strong>{brokenCount}</strong>
          <small>Past the date and not paid</small>
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
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="broken">Broken</option>
            <option value="kept">Kept</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="promise-list">
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: "#b42318", fontSize: 12 }}>{error}</p>}

          {!loading &&
            filteredPromises.map((promise) => {
              const info = promiseStatusInfo(promise.status);
              return (
                <div className="promise-row" key={promise.id}>
                  <div className="promise-customer">
                    <div className="customer-avatar">
                      {promise.customer_name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <Link
                        to={`/customers/${promise.customer_id}`}
                        className="customer-name-link"
                      >
                        {promise.customer_name}
                      </Link>

                      <span>{promise.note || "Payment commitment"}</span>
                    </div>
                  </div>

                  <div className="promise-info">
                    <span>Promised amount</span>
                    <strong>{formatCurrency(promise.amount)}</strong>
                  </div>

                  <div className="promise-info">
                    <span>Promise date</span>
                    <strong>{formatDate(promise.promised_on)}</strong>
                  </div>

                  <span className={`promise-status ${info.className}`}>
                    {info.label}
                  </span>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSelected(promise)}
                  >
                    View
                  </button>
                </div>
              );
            })}

          {!loading && !error && filteredPromises.length === 0 && (
            <div className="customer-empty">
              <strong>No promises found</strong>
              <p>
                {promises.length === 0
                  ? "Add your first payment promise to get started."
                  : "No payment promises match the selected status."}
              </p>
            </div>
          )}
        </div>
      </div>

      {selected && !confirmingCancel && (
        <EntityModal
          title="Payment promise details"
          description={`${selected.customer_name} promised ${formatCurrency(selected.amount)} by ${formatDate(selected.promised_on)}.`}
          onClose={closeAll}
        >
          <div className="entity-modal-details">
            <div><span>Customer</span><strong>{selected.customer_name}</strong></div>
            <div><span>Promised amount</span><strong>{formatCurrency(selected.amount)}</strong></div>
            <div><span>Paid so far</span><strong>{formatCurrency(selected.paid_amount)}</strong></div>
            <div><span>Remaining</span><strong>{formatCurrency(selected.remaining_amount)}</strong></div>
            <div><span>Promise date</span><strong>{formatDate(selected.promised_on)}</strong></div>
            <div><span>Status</span><strong>{promiseStatusInfo(selected.status).label}</strong></div>
            <div><span>Note</span><strong>{selected.note || "—"}</strong></div>
            {selected.cancelled_at && (
              <div><span>Cancel reason</span><strong>{selected.cancel_reason || "—"}</strong></div>
            )}
          </div>
          <div className="entity-modal-actions">
            <button type="button" className="secondary-button" onClick={closeAll}>
              Close
            </button>
            {!selected.cancelled_at && (
              <>
                <Link
                  to={`/promises/${selected.id}/edit`}
                  className="secondary-button"
                  onClick={closeAll}
                >
                  Edit promise
                </Link>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    setCancelError("");
                    setConfirmingCancel(true);
                  }}
                >
                  Cancel promise
                </button>
              </>
            )}
          </div>
        </EntityModal>
      )}

      {selected && confirmingCancel && (
        <EntityModal
          title="Cancel payment promise?"
          description={`Cancel ${selected.customer_name}'s promise of ${formatCurrency(selected.amount)} due ${formatDate(selected.promised_on)}? A cancelled promise cannot be edited.`}
          onClose={() => setConfirmingCancel(false)}
        >
          <div className="form-group">
            <label htmlFor="cancel-reason">Reason</label>
            <textarea
              id="cancel-reason"
              rows={3}
              placeholder="Why is this promise being cancelled?"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </div>
          {cancelError && (
            <p style={{ color: "#b42318", fontSize: 12 }}>{cancelError}</p>
          )}
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setConfirmingCancel(false)}
            >
              Back
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel promise"}
            </button>
          </div>
        </EntityModal>
      )}
    </section>
  );
}