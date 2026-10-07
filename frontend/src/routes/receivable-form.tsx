import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { customerOptions } from "../data/customers";
import {
  addReceivable,
  getReceivable,
  updateReceivable,
  type ReceivableStatus,
} from "../data/receivables";
import { setSaveFeedback } from "../data/save-feedback";

export function AddReceivablePage() {
  return <ReceivableFormScreen isEdit={false} />;
}

export function EditReceivablePage() {
  return <ReceivableFormScreen isEdit={true} />;
}

function ReceivableFormScreen({ isEdit }: { isEdit: boolean }) {
  const navigate = useNavigate();
  const { customerId: routeCustomerId, receivableId } = useParams();
  const existing = isEdit && receivableId ? getReceivable(Number(receivableId)) : undefined;
  const [customerId, setCustomerId] = useState(existing?.customerId ?? routeCustomerId ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.originalAmount) : "");
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "");
  const [status, setStatus] = useState<ReceivableStatus>(existing?.status ?? "Outstanding");
  const [description, setDescription] = useState(existing?.description ?? "");

  if (isEdit && !existing) {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <strong>Receivable not found</strong>
          <p>This receivable may have been removed.</p>
          <Link to="/receivables" className="secondary-button">Back to receivables</Link>
        </div>
      </section>
    );
  }

  const cancelPath = isEdit
    ? "/receivables"
    : routeCustomerId
      ? `/customers/${routeCustomerId}`
      : "/receivables";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const customer = customerOptions.find((item) => item.id === customerId);
    const numericAmount = Number(amount);
    if (!customer || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    if (!description.trim()) {
      const input = event.currentTarget.elements.namedItem("receivable-description") as HTMLTextAreaElement;
      input.setCustomValidity("Please enter a description.");
      input.reportValidity();
      return;
    }

    const receivable = {
      customerId,
      customer: customer.name,
      description: description.trim(),
      originalAmount: numericAmount,
      outstanding: existing && existing.status === status && existing.originalAmount === numericAmount
        ? existing.outstanding
        : status === "Paid"
          ? 0
          : status === "Partially paid"
            ? Math.round(numericAmount / 2 * 100) / 100
            : numericAmount,
      dueDate,
      status,
    };
    if (existing) {
      updateReceivable(existing.id, receivable);
      setSaveFeedback("Receivable changes saved.");
    } else {
      addReceivable(receivable);
      setSaveFeedback("Receivable added.");
    }
    navigate("/receivables");
  };

  return (
    <section className="content-page">
      <div className="form-page-header">
        <div>
          <Link to={cancelPath} className="back-link">
            ← Back to receivables
          </Link>
          <p className="eyebrow">RECEIVABLES</p>
          <h1>{isEdit ? "Edit receivable" : "Add receivable"}</h1>
          <p className="page-description">
            {isEdit
              ? "Update the details of this customer receivable."
              : "Add the details of a new customer receivable."}
          </p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-section-header">
          <h2>Receivable information</h2>
          <p>Capture the customer, amount, and due date for this receivable.</p>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="receivable-customer">Customer</label>
            <select
              id="receivable-customer"
              value={customerId}
              required
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="" disabled>Select customer</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="receivable-amount">Amount</label>
            <input
              id="receivable-amount"
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
            <label htmlFor="receivable-date">Due date</label>
            <input
              id="receivable-date"
              type="date"
              value={dueDate}
              required
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="receivable-status">Status</label>
            <select
              id="receivable-status"
              className={`status-select ${status.toLowerCase().replace(/\s+/g, "-")}`}
              value={status}
              onChange={(event) => setStatus(event.target.value as ReceivableStatus)}
            >
              <option value="Outstanding">Outstanding</option>
              <option value="Partially paid">Partially paid</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label htmlFor="receivable-description">Description</label>
            <textarea
              id="receivable-description"
              rows={4}
              placeholder="Describe this receivable..."
              value={description}
              required
              onChange={(event) => {
                event.target.setCustomValidity("");
                setDescription(event.target.value);
              }}
            />
          </div>
        </div>

        <div className="form-actions">
          <Link to={cancelPath} className="secondary-button form-button">Cancel</Link>
          <button type="submit" className="primary-button">
            {isEdit ? "Save changes" : "Save receivable"}
          </button>
        </div>
      </form>
    </section>
  );
}