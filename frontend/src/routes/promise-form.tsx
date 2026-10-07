import { Link, useNavigate, useParams } from "react-router";
import { useState, type FormEvent } from "react";
import { customerOptions } from "../data/customers";
import {
  addPromise,
  getPromise,
  updatePromise,
  type PromiseStatus,
} from "../data/promises";
import { setSaveFeedback } from "../data/save-feedback";

export function AddPromisePage() {
  return <PromiseFormScreen isEdit={false} />;
}

export function EditPromisePage() {
  return <PromiseFormScreen isEdit={true} />;
}

function PromiseFormScreen({ isEdit }: { isEdit: boolean }) {
  const navigate = useNavigate();
  const { promiseId } = useParams();
  const existing = isEdit && promiseId ? getPromise(Number(promiseId)) : undefined;
  const [customerId, setCustomerId] = useState(existing?.customerId ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [promiseDate, setPromiseDate] = useState(existing?.promiseDate ?? "");
  const [status, setStatus] = useState<PromiseStatus>(existing?.status ?? "Upcoming");

  if (isEdit && !existing) {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <strong>Payment promise not found</strong>
          <p>This payment promise may have been removed.</p>
          <Link to="/promises" className="secondary-button">Back to promises</Link>
        </div>
      </section>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const customer = customerOptions.find((item) => item.id === customerId);
    const numericAmount = Number(amount);
    if (!customer || !Number.isFinite(numericAmount) || numericAmount <= 0) return;

    const paymentPromise = {
      customer: customer.name,
      customerId,
      amount: numericAmount,
      promiseDate,
      status,
    };

    if (existing) {
      updatePromise(existing.id, paymentPromise);
      setSaveFeedback("Promise changes saved.");
    } else {
      addPromise(paymentPromise);
      setSaveFeedback("Promise added.");
    }
    navigate("/promises");
  };

  return (
    <section className="content-page">
      <div className="form-page-header">
        <div>
          <Link to="/promises" className="back-link">
            ← Back to promises
          </Link>

          <p className="eyebrow">PROMISES</p>
          <h1>{isEdit ? "Edit promise" : "Add promise"}</h1>

          <p className="page-description">
            {isEdit
              ? "Update the payment commitment details."
              : "Add a new payment commitment from a customer."}
          </p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-section-header">
          <h2>Payment promise</h2>
          <p>
            {isEdit
              ? "Update the customer, promised amount, and expected payment date."
              : "Capture the customer, promised amount, and expected payment date."}
          </p>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="promise-customer">Customer</label>
            <select
              id="promise-customer"
              value={customerId}
              required
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="" disabled>Select customer</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="promise-amount">Promised amount</label>
            <input
              id="promise-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              required
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="promise-date">Promise date</label>
            <input
              id="promise-date"
              type="date"
              value={promiseDate}
              required
              onChange={(event) => setPromiseDate(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="promise-status">Status</label>
            <select
              id="promise-status"
              className={`status-select ${status.toLowerCase()}`}
              value={status}
              required
              onChange={(event) => setStatus(event.target.value as PromiseStatus)}
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <Link to="/promises" className="secondary-button form-button">
            Cancel
          </Link>

          <button type="submit" className="primary-button">
            {isEdit ? "Save changes" : "Save promise"}
          </button>
        </div>
      </form>
    </section>
  );
}
