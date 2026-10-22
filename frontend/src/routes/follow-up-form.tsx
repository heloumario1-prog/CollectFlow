import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { customerOptions } from "../data/customers";
import {
  addFollowUp,
  getFollowUps,
  updateFollowUp,
  type ContactMethod,
  type FollowUpStatus,
} from "../data/follow-ups";
import { setSaveFeedback } from "../data/save-feedback";

export function AddFollowUpPage() {
  return <FollowUpFormScreen isEdit={false} />;
}

export function EditFollowUpPage() {
  return <FollowUpFormScreen isEdit={true} />;
}

const receivableOptions = [
  { customerId: "hassan-al-khalil", label: "Cleaning supplies" },
  { customerId: "samir-youssef", label: "Wholesale products" },
  { customerId: "maria-hani", label: "Office supplies" },
  { customerId: "hassan-al-khalil", label: "Delivery equipment" },
];

function FollowUpFormScreen({ isEdit }: { isEdit: boolean }) {
  const navigate = useNavigate();
  const { followUpId } = useParams();
  const existing = isEdit
    ? getFollowUps().find((followUp) => followUp.id === Number(followUpId))
    : undefined;
  const [customerId, setCustomerId] = useState(existing?.customerId ?? "");
  const [receivable, setReceivable] = useState(existing?.receivable ?? "");
  const [date, setDate] = useState(existing?.date ?? "");
  const [method, setMethod] = useState<ContactMethod>(existing?.method ?? "WhatsApp");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [status, setStatus] = useState<FollowUpStatus>(existing?.status ?? "Upcoming");

  if (isEdit && !existing) {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <strong>Follow-up not found</strong>
          <p>This follow-up may have been removed.</p>
          <Link to="/follow-ups" className="secondary-button">Back to follow-ups</Link>
        </div>
      </section>
    );
  }

  const availableReceivables = receivableOptions.filter(
    (option) => option.customerId === customerId,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const customer = customerOptions.find((option) => option.id === customerId);
    if (!customer || !receivable) return;

    const followUp = {
      customerId,
      customer: customer.name,
      receivable,
      date,
      method,
      status,
      notes,
    };

    if (existing) {
      updateFollowUp(existing.id, followUp);
      setSaveFeedback("Follow-up changes saved.");
    } else {
      addFollowUp(followUp);
      setSaveFeedback("Follow-up scheduled.");
    }
    navigate("/follow-ups");
  };

  return (
    <section className="content-page">
      <div className="form-page-header">
        <div>
          <Link to="/follow-ups" className="back-link">
            Back to follow-ups
          </Link>

          <p className="eyebrow">FOLLOW-UPS</p>
          <h1>{isEdit ? "Edit follow-up" : "Add Follow-up"}</h1>

          <p className="page-description">
            {isEdit
              ? "Update the customer payment follow-up details."
              : "Plan the next customer follow-up and contact method."}
          </p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-section-header">
          <h2>Follow-up plan</h2>
          <p>Set the customer, receivable, follow-up date, and contact method.</p>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="followup-customer">Customer</label>
            <select
              id="followup-customer"
              value={customerId}
              required
              onChange={(event) => {
                setCustomerId(event.target.value);
                setReceivable("");
              }}
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
            <label htmlFor="followup-receivable">Related receivable</label>
            <select
              id="followup-receivable"
              value={receivable}
              required
              disabled={!customerId}
              onChange={(event) => setReceivable(event.target.value)}
            >
              <option value="" disabled>Select receivable</option>
              {availableReceivables.map((option) => (
                <option key={option.label} value={option.label}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="followup-date">Follow-up date</label>
            <input
              id="followup-date"
              type="date"
              value={date}
              required
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="followup-method">Contact method</label>
            <select
              id="followup-method"
              value={method}
              required
              onChange={(event) => setMethod(event.target.value as ContactMethod)}
            >
              <option value="WhatsApp">WhatsApp</option>
              <option value="Phone Call">Phone Call</option>
              <option value="SMS">SMS</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="followup-status">Status</label>
            <select
              id="followup-status"
              value={status}
              required
              onChange={(event) => setStatus(event.target.value as FollowUpStatus)}
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Due Today">Due Today</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label htmlFor="followup-notes">Notes</label>
            <textarea
              id="followup-notes"
              rows={4}
              placeholder="Add notes for the follow-up..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <Link to="/follow-ups" className="secondary-button form-button">
            Cancel
          </Link>

          <button type="submit" className="primary-button">
            {isEdit ? "Save changes" : "Save follow-up"}
          </button>
        </div>
      </form>
    </section>
  );
}
