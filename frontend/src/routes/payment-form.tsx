import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { customerOptions } from "../data/customers";
import { addPayment, getPayment, updatePayment } from "../data/payments";
import { setSaveFeedback } from "../data/save-feedback";

const paymentMethods = ["Cash", "Bank transfer", "Whish", "OMT"];

export function RecordPaymentPage() {
  return <PaymentFormScreen isEdit={false} />;
}

export function EditPaymentPage() {
  return <PaymentFormScreen isEdit={true} />;
}

function PaymentFormScreen({ isEdit }: { isEdit: boolean }) {
  const navigate = useNavigate();
  const { paymentId } = useParams();
  const existing = isEdit && paymentId ? getPayment(Number(paymentId)) : undefined;
  const [customerId, setCustomerId] = useState(existing?.customerId ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [date, setDate] = useState(existing?.date ?? "");
  const [method, setMethod] = useState(existing?.method ?? "");

  if (isEdit && !existing) {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <strong>Payment not found</strong>
          <p>This payment may have been removed.</p>
          <Link to="/payments" className="secondary-button">Back to payments</Link>
        </div>
      </section>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const customer = customerOptions.find((item) => item.id === customerId);
    const numericAmount = Number(amount);
    if (!customer || !Number.isFinite(numericAmount) || numericAmount <= 0 || !method) return;
    const payment = {
      customerId,
      customer: customer.name,
      amount: numericAmount,
      date,
      method,
      status: "Completed" as const,
    };
    if (existing) {
      updatePayment(existing.id, payment);
      setSaveFeedback("Payment changes saved.");
    } else {
      addPayment(payment);
      setSaveFeedback("Payment recorded.");
    }
    navigate("/payments");
  };

  return (
    <section className="content-page">
      <div className="form-page-header">
        <div>
          <Link to="/payments" className="back-link">
            ← Back to payments
          </Link>

          <p className="eyebrow">PAYMENTS</p>
          <h1>{isEdit ? "Edit payment" : "Record payment"}</h1>

          <p className="page-description">
            {isEdit ? "Update the payment details." : "Log a customer payment received in the system."}
          </p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-section-header">
          <h2>Payment details</h2>
          <p>Add the customer, amount, and payment date for the received funds.</p>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="payment-customer">Customer</label>
            <select id="payment-customer" value={customerId} required onChange={(event) => setCustomerId(event.target.value)}>
              <option value="" disabled>Select customer</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="payment-amount">Amount</label>
            <input id="payment-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} required onChange={(event) => setAmount(event.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="payment-date">Payment date</label>
            <input id="payment-date" type="date" value={date} required onChange={(event) => setDate(event.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="payment-method">Method</label>
            <select id="payment-method" value={method} required onChange={(event) => setMethod(event.target.value)}>
              <option value="" disabled>Select method</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <Link to="/payments" className="secondary-button form-button">
            Cancel
          </Link>

          <button type="submit" className="primary-button">
            {isEdit ? "Save changes" : "Save payment"}
          </button>
        </div>
      </form>
    </section>
  );
}
