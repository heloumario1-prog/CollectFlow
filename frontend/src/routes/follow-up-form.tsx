
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useCustomerOptions } from "../data/customers";
import {
  addFollowUp,
  getFollowUps,
  updateFollowUp,
  type FollowUp,
} from "../data/follow-ups";
import { listReceivables, type ApiReceivable } from "../data/receivables";
import { setSaveFeedback } from "../data/save-feedback";

export function AddFollowUpPage() {
  return <FollowUpFormScreen isEdit={false} />;
}

export function EditFollowUpPage() {
  return <FollowUpFormScreen isEdit={true} />;
}

function FollowUpFormScreen({ isEdit }: { isEdit: boolean }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { options: customers, loading: customersLoading } = useCustomerOptions();

  const [existing, setExisting] = useState<FollowUp | null>(null);
  const [receivables, setReceivables] = useState<ApiReceivable[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [receivableId, setReceivableId] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setError("");

        const [allReceivables, allFollowUps] = await Promise.all([
          listReceivables(),
          getFollowUps(),
        ]);

        if (cancelled) return;

        setReceivables(allReceivables);

        if (isEdit) {
            const found = allFollowUps.find(
  (item) => item.id === Number(id),
);

          if (!found) {
            setError("Follow-up not found.");
          } else {
            setExisting(found);
            setCustomerId(String(found.customerId));
            setReceivableId(
              found.receivableId === null ? "" : String(found.receivableId),
            );

            const parsed = new Date(found.date);
            if (!Number.isNaN(parsed.getTime())) {
              const local = new Date(
                parsed.getTime() - parsed.getTimezoneOffset() * 60000,
              );
              setDate(local.toISOString().slice(0, 16));
            }

            setNotes(found.notes);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Could not load the follow-up form. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isEdit, id]);

  const availableReceivables = receivables.filter(
    (item) => item.customer_detail.id === Number(customerId),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!customerId || !date || !notes.trim()) {
      setError("Please select a customer, enter the contact date and time, and add notes.");
      return;
    }

    setSaving(true);

    try {
      const input = {
        customerId: Number(customerId),
        receivableId: receivableId ? Number(receivableId) : null,
        date: new Date(date).toISOString(),
        notes: notes.trim(),
      };

      if (existing) {
        await updateFollowUp(existing.id, input);
        setSaveFeedback("Follow-up changes saved.");
      } else {
        await addFollowUp(input);
        setSaveFeedback("Follow-up contact recorded.");
      }

      navigate("/follow-ups");
    } catch {
      setError("Could not save the follow-up. Check your entries and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || customersLoading) {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <p>Loading follow-up form...</p>
        </div>
      </section>
    );
  }

  if (error === "Follow-up not found.") {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <strong>Follow-up not found</strong>
          <p>This record may not exist or may no longer be available.</p>
          <Link to="/follow-ups" className="secondary-button">
            Back to follow-ups
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="content-page">
      <div className="form-page-header">
        <div>
          <Link to="/follow-ups" className="back-link">
            Back to follow-ups
          </Link>

          <p className="eyebrow">FOLLOW-UPS</p>
          <h1>{isEdit ? "Edit follow-up" : "Record Follow-up"}</h1>

          <p className="page-description">
            Record a customer contact and any payment-related notes.
          </p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-section-header">
          <h2>Contact details</h2>
          <p>Select the customer and record what happened.</p>
        </div>

        {error && (
          <div className="customer-empty" role="alert">
            <strong>{error}</strong>
          </div>
        )}

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="followup-customer">Customer</label>
            <select
              id="followup-customer"
              value={customerId}
              required
              onChange={(event) => {
                setCustomerId(event.target.value);
                setReceivableId("");
              }}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="followup-receivable">
              Related receivable (optional)
            </label>
            <select
              id="followup-receivable"
              value={receivableId}
              disabled={!customerId}
              onChange={(event) => setReceivableId(event.target.value)}
            >
              <option value="">No related receivable</option>
              {availableReceivables.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.reference || item.description || `Receivable #${item.id}`}
                  {" — "}
                  {item.currency} {item.remaining_amount}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="followup-date">Contact date and time</label>
            <input
              id="followup-date"
              type="datetime-local"
              value={date}
              required
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="followup-notes">Contact notes</label>
            <textarea
              id="followup-notes"
              rows={4}
              placeholder="What did the customer say? Was a payment date agreed?"
              value={notes}
              required
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <Link to="/follow-ups" className="secondary-button form-button">
            Cancel
          </Link>

          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Record follow-up"}
          </button>
        </div>
      </form>
    </section>
  );
}
