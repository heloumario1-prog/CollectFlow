import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "../api/client";
import { useCustomerOptions } from "../data/customers";
import {
  createReceivable,
  getReceivableById,
  updateReceivableById,
} from "../data/receivables";
import { setSaveFeedback } from "../data/save-feedback";

const errorStyle = { color: "#b42318", fontSize: "11px", margin: 0 };

const today = () => new Date().toLocaleDateString("en-CA");

export function AddReceivablePage() {
  return <ReceivableFormScreen isEdit={false} />;
}

export function EditReceivablePage() {
  return <ReceivableFormScreen isEdit={true} />;
}

function ReceivableFormScreen({ isEdit }: { isEdit: boolean }) {
  const navigate = useNavigate();
  const params = useParams();
  const routeCustomerId = params.customerId;
  const receivableId = params.receivableId ?? params.id;
  const { options: customerOptions } = useCustomerOptions();

  const [customerId, setCustomerId] = useState(routeCustomerId ?? "");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(isEdit && Boolean(receivableId));
  const [loadFailed, setLoadFailed] = useState(isEdit && !receivableId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEdit || !receivableId) return;
    let active = true;
    getReceivableById(receivableId)
      .then((receivable) => {
        if (!active) return;
        setCustomerId(String(receivable.customer_detail.id));
        setAmount(receivable.original_amount);
        setIssueDate(receivable.issue_date);
        setDueDate(receivable.due_date);
        setReference(receivable.reference ?? "");
        setDescription(receivable.description ?? "");
      })
      .catch((e) => {
        if (!active) return;
        setLoadFailed(true);
        setError(e instanceof Error ? e.message : "Could not load receivable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEdit, receivableId]);

  const cancelPath = isEdit
    ? "/receivables"
    : routeCustomerId
      ? `/customers/${routeCustomerId}`
      : "/receivables";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!customerId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Choose a customer and enter an amount greater than zero.");
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      const input = {
        customer: Number(customerId),
        original_amount: numericAmount.toFixed(2),
        issue_date: issueDate,
        due_date: dueDate,
        reference,
        description,
      };
      if (isEdit && receivableId) {
        await updateReceivableById(receivableId, input);
        setSaveFeedback("Receivable changes saved.");
      } else {
        await createReceivable(input);
        setSaveFeedback("Receivable added.");
      }
      navigate("/receivables");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFieldErrors(e.fields);
      } else {
        setError("Could not save the receivable.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="content-page">
        <div className="form-card">Loading...</div>
      </section>
    );
  }

  if (loadFailed) {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <strong>Receivable not found</strong>
          <p>{error || "This receivable may have been removed."}</p>
          <Link to="/receivables" className="secondary-button">
            Back to receivables
          </Link>
        </div>
      </section>
    );
  }

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

        {error && <p style={{ ...errorStyle, marginBottom: 16 }}>{error}</p>}

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
                <option key={customer.id} value={String(customer.id)}>
                  {customer.name}
                </option>
              ))}
            </select>
            {fieldErrors.customer && <p style={errorStyle}>{fieldErrors.customer}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="receivable-amount">Amount (USD)</label>
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
            {fieldErrors.original_amount && (
              <p style={errorStyle}>{fieldErrors.original_amount}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="receivable-issue-date">Issue date</label>
            <input
              id="receivable-issue-date"
              type="date"
              value={issueDate}
              required
              onChange={(event) => setIssueDate(event.target.value)}
            />
            {fieldErrors.issue_date && <p style={errorStyle}>{fieldErrors.issue_date}</p>}
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
            {fieldErrors.due_date && <p style={errorStyle}>{fieldErrors.due_date}</p>}
          </div>

          <div className="form-group full-width">
            <label htmlFor="receivable-reference">Reference (optional)</label>
            <input
              id="receivable-reference"
              value={reference}
              placeholder="Invoice number or reference"
              onChange={(event) => setReference(event.target.value)}
            />
            {fieldErrors.reference && <p style={errorStyle}>{fieldErrors.reference}</p>}
          </div>

          <div className="form-group full-width">
            <label htmlFor="receivable-description">Description</label>
            <textarea
              id="receivable-description"
              rows={4}
              placeholder="Describe this receivable..."
              value={description}
              required
              onChange={(event) => setDescription(event.target.value)}
            />
            {fieldErrors.description && (
              <p style={errorStyle}>{fieldErrors.description}</p>
            )}
          </div>
        </div>

        <div className="form-actions">
          <Link to={cancelPath} className="secondary-button form-button">
            Cancel
          </Link>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Save receivable"}
          </button>
        </div>
      </form>
    </section>
  );
}