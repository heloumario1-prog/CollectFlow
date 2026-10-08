import { useState } from "react";
import { Link } from "react-router";
import { EntityModal } from "../components/EntityModal";
import { deletePayment, getPayments, type Payment } from "../data/payments";
import { SaveFeedback } from "../components/SaveFeedback";

const paymentMethods = ["Cash", "Bank transfer", "Whish", "OMT"];

export function PaymentsPage() {
  const [methodFilter, setMethodFilter] = useState("All");
  const [payments, setPayments] = useState(getPayments);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  const displayDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const latestPayment = [...payments].sort((left, right) => right.date.localeCompare(left.date))[0];
  const refreshPayments = () => setPayments(getPayments());

  const filteredPayments =
    methodFilter === "All"
      ? payments
      : payments.filter(
          (payment) => payment.method === methodFilter
        );

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

      <div className="payment-summary">
        <article className="stat-card">
          <span>Total collected</span>
          <strong>{formatCurrency(payments.reduce((total, payment) => total + payment.amount, 0))}</strong>
          <small>Payments recorded</small>
        </article>

        <article className="stat-card">
          <span>Payments</span>
          <strong>{payments.length}</strong>
          <small>Total transactions</small>
        </article>

        <article className="stat-card">
          <span>Latest payment</span>
          <strong>{latestPayment ? formatCurrency(latestPayment.amount) : "$0"}</strong>
          <small>{latestPayment ? `Received ${displayDate(latestPayment.date)}` : "No payments recorded"}</small>
        </article>
      </div>

      <div className="content-panel payments-panel">
        <div className="payments-toolbar">
          <div>
            <strong>Payment history</strong>
            <span>
              {filteredPayments.length} payments shown
            </span>
          </div>

          <select
            className="status-filter"
            value={methodFilter}
            onChange={(event) =>
              setMethodFilter(event.target.value)
            }
          >
            <option value="All">All methods</option>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <div className="payment-list">
          {filteredPayments.map((payment) => (
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
                <strong>{payment.method}</strong>
              </div>

              <span className="payment-status">
                {payment.status}
              </span>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedPayment(payment)}
              >
                View
              </button>
            </div>
          ))}

          {filteredPayments.length === 0 && (
            <div className="customer-empty">
              <strong>No payments found</strong>
              <p>
                No payments match the selected payment method.
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedPayment && !confirmingDelete && (
        <EntityModal
          title="Payment details"
          description={`${formatCurrency(selectedPayment.amount)} received from ${selectedPayment.customer} on ${displayDate(selectedPayment.date)}.`}
          onClose={() => setSelectedPayment(null)}
        >
          <div className="entity-modal-details">
            <div><span>Customer</span><strong>{selectedPayment.customer}</strong></div>
            <div><span>Amount</span><strong>{formatCurrency(selectedPayment.amount)}</strong></div>
            <div><span>Payment date</span><strong>{displayDate(selectedPayment.date)}</strong></div>
            <div><span>Method</span><strong>{selectedPayment.method}</strong></div>
            <div><span>Status</span><strong>{selectedPayment.status}</strong></div>
          </div>
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedPayment(null)}
            >
              Close
            </button>
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
              onClick={() => setConfirmingDelete(true)}
            >
              Delete payment
            </button>
          </div>
        </EntityModal>
      )}

      {selectedPayment && confirmingDelete && (
        <EntityModal
          title="Delete payment?"
          description={`Delete the ${formatCurrency(selectedPayment.amount)} payment from ${selectedPayment.customer}? This action cannot be undone.`}
          onClose={() => setConfirmingDelete(false)}
        >
          <div className="entity-modal-actions">
            <button type="button" className="secondary-button" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                deletePayment(selectedPayment.id);
                refreshPayments();
                setConfirmingDelete(false);
                setSelectedPayment(null);
              }}
            >
              Delete payment
            </button>
          </div>
        </EntityModal>
      )}
    </section>
  );
}