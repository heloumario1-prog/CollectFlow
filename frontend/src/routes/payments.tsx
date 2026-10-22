
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { EntityModal } from "../components/EntityModal";
import {
  getPayments,
  voidPayment,
  methodLabels,
  type Payment,
  type PaymentMethod,
} from "../data/payments";
import { SaveFeedback } from "../components/SaveFeedback";

const paymentMethods = Object.keys(methodLabels) as PaymentMethod[];

export function PaymentsPage() {
  const [methodFilter, setMethodFilter] = useState("All");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [confirmingVoid, setConfirmingVoid] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  const displayDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const loadPayments = async () => {
    try {
      setError("");
      const result = await getPayments();
      setPayments(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load payments.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, []);

  const latestPayment = [...payments].sort((left, right) =>
    right.date.localeCompare(left.date),
  )[0];

  const completedPayments = payments.filter(
    (payment) => payment.status === "Completed",
  );

  const filteredPayments =
    methodFilter === "All"
      ? payments
      : payments.filter((payment) => payment.method === methodFilter);

  const handleVoidPayment = async () => {
    if (!selectedPayment || voidReason.trim().length < 3) {
      setError("Please provide a reason of at least 3 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await voidPayment(selectedPayment.id, voidReason);

      setSelectedPayment(null);
      setConfirmingVoid(false);
      setVoidReason("");

      await loadPayments();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not void this payment.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="content-page">
      <div className="page-header-row">
        <div>
          <p className="eyebrow">PAYMENTS</p>
          <h1>Payments</h1>
          <p className="page-description">
            Track customer payments and payment history.
          </p>
        </div>

        <Link
          to="/payments/new"
          className="primary-button button-link"
        >
          + Record payment
        </Link>
      </div>

      <SaveFeedback />

      {error && (
        <div className="customer-empty" role="alert">
          <strong>Something went wrong</strong>
          <p>{error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void loadPayments()}
          >
            Try again
          </button>
        </div>
      )}

      <div className="payment-summary">
        <article className="stat-card">
          <span>Total collected</span>
          <strong>
            {formatCurrency(
              completedPayments.reduce(
                (total, payment) => total + payment.amount,
                0,
              ),
            )}
          </strong>
          <small>Completed payments only</small>
        </article>

        <article className="stat-card">
          <span>Payments</span>
          <strong>{payments.length}</strong>
          <small>Total transactions</small>
        </article>

        <article className="stat-card">
          <span>Latest payment</span>
          <strong>
            {latestPayment ? formatCurrency(latestPayment.amount) : "$0.00"}
          </strong>
          <small>
            {latestPayment
              ? `Received ${displayDate(latestPayment.date)}`
              : "No payments recorded"}
          </small>
        </article>
      </div>

      <div className="content-panel payments-panel">
        <div className="payments-toolbar">
          <div>
            <strong>Payment history</strong>
            <span>{filteredPayments.length} payments shown</span>
          </div>

          <select
            className="status-filter"
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)}
          >
            <option value="All">All methods</option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {methodLabels[method]}
              </option>
            ))}
          </select>
        </div>

        <div className="payment-list">
          {loading ? (
            <div className="customer-empty">
              <p>Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="customer-empty">
              <strong>No payments found</strong>
              <p>
                {payments.length === 0
                  ? "No payments have been recorded yet."
                  : "No payments match the selected payment method."}
              </p>
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div className="payment-row" key={payment.id}>
                <div className="payment-customer">
                  <div className="customer-avatar">
                    {payment.customer.charAt(0)}
                  </div>

                  <div>
                    <Link
                      to={`/customers/${payment.customerId}`}
                      className="customer-name-link"
                    >
                      {payment.customer}
                    </Link>
                    <span>Customer payment</span>
                  </div>
                </div>

                <div className="payment-info">
                  <span>Amount</span>
                  <strong>{formatCurrency(payment.amount)}</strong>
                </div>

                <div className="payment-info">
                  <span>Payment date</span>
                  <strong>{displayDate(payment.date)}</strong>
                </div>

                <div className="payment-info">
                  <span>Method</span>
                  <strong>{methodLabels[payment.method]}</strong>
                </div>

                <span className="payment-status">
                  {payment.status}
                </span>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSelectedPayment(payment);
                    setConfirmingVoid(false);
                    setVoidReason("");
                    setError("");
                  }}
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedPayment && !confirmingVoid && (
        <EntityModal
          title="Payment details"
          description={`${formatCurrency(selectedPayment.amount)} received from ${selectedPayment.customer} on ${displayDate(selectedPayment.date)}.`}
          onClose={() => setSelectedPayment(null)}
        >
          <div className="entity-modal-details">
            <div>
              <span>Customer</span>
              <strong>{selectedPayment.customer}</strong>
            </div>
            <div>
              <span>Amount</span>
              <strong>{formatCurrency(selectedPayment.amount)}</strong>
            </div>
            <div>
              <span>Payment date</span>
              <strong>{displayDate(selectedPayment.date)}</strong>
            </div>
            <div>
              <span>Method</span>
              <strong>{methodLabels[selectedPayment.method]}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{selectedPayment.status}</strong>
            </div>
            {selectedPayment.status === "Voided" &&
              selectedPayment.voidReason && (
                <div>
                  <span>Void reason</span>
                  <strong>{selectedPayment.voidReason}</strong>
                </div>
              )}
          </div>

          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedPayment(null)}
            >
              Close
            </button>

            {selectedPayment.status === "Completed" && (
              <>
                <Link
                  to={`/payments/${selectedPayment.id}/edit`}
                  className="secondary-button"
                  onClick={() => setSelectedPayment(null)}
                >
                  Edit payment
                </Link>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    setConfirmingVoid(true);
                    setError("");
                  }}
                >
                  Void payment
                </button>
              </>
            )}
          </div>
        </EntityModal>
      )}

      {selectedPayment && confirmingVoid && (
        <EntityModal
          title="Void payment?"
          description={`This will void the ${formatCurrency(selectedPayment.amount)} payment from ${selectedPayment.customer}. The financial record will be retained.`}
          onClose={() => {
            if (!saving) {
              setConfirmingVoid(false);
              setVoidReason("");
            }
          }}
        >
          <div className="form-group">
            <label htmlFor="void-reason">Reason for voiding</label>
            <textarea
              id="void-reason"
              value={voidReason}
              onChange={(event) => setVoidReason(event.target.value)}
              placeholder="Explain why this payment must be voided"
              required
              minLength={3}
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={() => {
                setConfirmingVoid(false);
                setVoidReason("");
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="danger-button"
              disabled={saving || voidReason.trim().length < 3}
              onClick={() => void handleVoidPayment()}
            >
              {saving ? "Voiding..." : "Confirm void"}
            </button>
          </div>
        </EntityModal>
      )}
    </section>
  );
}
