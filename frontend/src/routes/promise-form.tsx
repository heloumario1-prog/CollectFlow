import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { listReceivables, type ApiReceivable } from "../data/receivables";
import {
  createPromise,
  getPromiseById,
  updatePromiseById,
} from "../data/promises";
import { setSaveFeedback } from "../data/save-feedback";

const errorStyle = { color: "var(--cf-danger)", fontSize: "13px", margin: 0 };

const money = (value: string | number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value));

export function AddPromisePage() {
  return <PromiseFormScreen isEdit={false} />;
}

export function EditPromisePage() {
  return <PromiseFormScreen isEdit={true} />;
}

function PromiseFormScreen({ isEdit }: { isEdit: boolean }) {
  const navigate = useNavigate();
  const params = useParams();
  const promiseId = params.promiseId ?? params.id;

  const [receivables, setReceivables] = useState<ApiReceivable[]>([]);
  const [receivableId, setReceivableId] = useState("");
  const [amount, setAmount] = useState("");
  const [promisedOn, setPromisedOn] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(isEdit && Boolean(promiseId));
  const [loadFailed, setLoadFailed] = useState(isEdit && !promiseId);
  const [cancelled, setCancelled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    listReceivables()
      .then((data) => {
        if (active) setReceivables(data);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Could not load receivables.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isEdit || !promiseId) return;
    let active = true;
    getPromiseById(promiseId)
      .then((promise) => {
        if (!active) return;
        if (promise.cancelled_at) setCancelled(true);
        setReceivableId(String(promise.receivable));
        setAmount(promise.amount);
        setPromisedOn(promise.promised_on);
        setNote(promise.note ?? "");
      })
      .catch((e) => {
        if (!active) return;
        setLoadFailed(true);
        setError(e instanceof Error ? e.message : "Could not load promise.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEdit, promiseId]);

  const receivableOptions = isEdit
    ? receivables
    : receivables.filter((item) => Number(item.remaining_amount) > 0);

  const selectedReceivable = receivables.find(
    (item) => String(item.id) === receivableId,
  );

  function handleReceivableChange(value: string) {
    setReceivableId(value);
    const chosen = receivables.find((item) => String(item.id) === value);
    if (!isEdit && chosen && !amount) setAmount(chosen.unpromised_amount);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!receivableId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Choose a receivable and enter an amount greater than zero.");
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      const input = {
        receivable: Number(receivableId),
        amount: numericAmount.toFixed(2),
        promised_on: promisedOn,
        note,
      };
      if (isEdit && promiseId) {
        await updatePromiseById(promiseId, input);
        setSaveFeedback("Promise changes saved.");
      } else {
        await createPromise(input);
        setSaveFeedback("Promise added.");
      }
      navigate("/promises");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFieldErrors(e.fields);
      } else {
        setError("Could not save the promise.");
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

  if (loadFailed || cancelled) {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <strong>
            {cancelled ? "Promise is cancelled" : "Payment promise not found"}
          </strong>
          <p>
            {cancelled
              ? "Cancelled promises cannot be edited."
              : error || "This payment promise may have been removed."}
          </p>
          <Link to="/promises" className="secondary-button">
            Back to promises
          </Link>
        </div>
      </section>
    );
  }

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
              ? "Update the promised amount and expected payment date."
              : "Choose the receivable, the promised amount, and the expected payment date."}
          </p>
        </div>

        {error && <p role="alert" style={{ ...errorStyle, marginBottom: 16 }}>{error}</p>}
        {fieldErrors.detail && (
          <p style={{ ...errorStyle, marginBottom: 16 }}>{fieldErrors.detail}</p>
        )}

        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="promise-receivable">Receivable</label>
            <select
              id="promise-receivable"
              value={receivableId}
              required
              disabled={isEdit}
              onChange={(event) => handleReceivableChange(event.target.value)}
            >
              <option value="" disabled>Select receivable</option>
              {receivableOptions.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.customer_detail.name} ·{" "}
                  {item.description || item.reference || `Receivable #${item.id}`} ·{" "}
                  {money(item.remaining_amount)} left
                </option>
              ))}
            </select>
            {selectedReceivable && (
              <p style={{ fontSize: "13px", margin: 0 }}>
                Available to promise: {money(selectedReceivable.unpromised_amount)}
              </p>
            )}
            {fieldErrors.receivable && (
              <p style={errorStyle}>{fieldErrors.receivable}</p>
            )}
            {!isEdit && receivableOptions.length === 0 && (
              <p style={{ fontSize: "13px", margin: 0 }}>
                There are no receivables with a balance yet. Add a receivable first.
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="promise-amount">Promised amount (USD)</label>
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
            {fieldErrors.amount && <p style={errorStyle}>{fieldErrors.amount}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="promise-date">Promise date</label>
            <input
              id="promise-date"
              type="date"
              value={promisedOn}
              required
              onChange={(event) => setPromisedOn(event.target.value)}
            />
            {fieldErrors.promised_on && (
              <p style={errorStyle}>{fieldErrors.promised_on}</p>
            )}
          </div>

          <div className="form-group full-width">
            <label htmlFor="promise-note">Note (optional)</label>
            <textarea
              id="promise-note"
              rows={3}
              placeholder="Anything worth remembering about this promise..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            {fieldErrors.note && <p style={errorStyle}>{fieldErrors.note}</p>}
          </div>
        </div>

        <div className="form-actions">
          <Link to="/promises" className="secondary-button form-button">
            Cancel
          </Link>

          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Save promise"}
          </button>
        </div>
      </form>
    </section>
  );
}