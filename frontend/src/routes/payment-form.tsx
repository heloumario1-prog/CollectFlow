
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ApiError } from "../api/client";
import { useCustomerOptions } from "../data/customers";
import { listPromisesForCustomer, type PromiseOption } from "../data/payment-promises";
import {
  addPayment,
  getPayment,
  updatePayment,
  methodLabels,
  type Payment,
  type PaymentMethod,
} from "../data/payments";
import { setSaveFeedback } from "../data/save-feedback";

const paymentMethods = Object.keys(methodLabels) as PaymentMethod[];

const beirutToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Beirut",
  }).format(new Date());

export function RecordPaymentPage() {
  return <PaymentFormScreen isEdit={false} />;
}

export function EditPaymentPage() {
  return <PaymentFormScreen isEdit={true} />;
}

function PaymentFormScreen({ isEdit }: { isEdit: boolean }) {
  const navigate = useNavigate();
  const { id: paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedCustomer = searchParams.get("customer") ?? "";
  const requestedPromise = searchParams.get("promise") ?? "";
  const { options: customers, loading: customersLoading, error: customerError } =
    useCustomerOptions();

  const submission = useRef<{ fingerprint: string; key: string } | null>(null);
  const [existing, setExisting] = useState<Payment | null>(null);
  const [customerId, setCustomerId] = useState(() => !isEdit && /^[1-9]\d*$/.test(requestedCustomer) ? requestedCustomer : "");
  const [promises, setPromises] = useState<PromiseOption[]>([]);
  const [promiseId, setPromiseId] = useState("");
  const [promisesLoading, setPromisesLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(beirutToday());
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEdit || !paymentId) {
      setLoading(false);
      return;
    }

    let active = true;

    getPayment(Number(paymentId))
      .then((payment) => {
        if (!active) return;

        if (!payment || payment.status === "Voided") {
          setNotFound(true);
          return;
        }

        setExisting(payment);
        setCustomerId(String(payment.customerId));
        setAmount(String(payment.amount));
        setDate(payment.date);
        setMethod(payment.method);
        setNote(payment.note ?? "");
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Could not load payment.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isEdit, paymentId]);

  useEffect(() => {
    if (!customerId || (isEdit && !existing)) {
      setPromises([]);
      setPromisesLoading(false);
      return;
    }

    let active = true;
    setPromises([]);
    setPromisesLoading(true);
    setError("");

    listPromisesForCustomer(Number(customerId), existing ?? undefined)
      .then((list) => {
        if (active) {
          setPromises(list);
          const linked = customerId === requestedCustomer
            ? list.find((promise) => String(promise.id) === requestedPromise)
            : undefined;
          const original = existing && list.find(promise => promise.id === existing.paymentPromiseId);
          setPromiseId(original ? String(original.id) : linked ? String(linked.id) : list.length === 1 ? String(list[0].id) : "");
        }
      })
      .catch((e) => {
        if (active) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not load this customer's payment promises.",
          );
        }
      })
      .finally(() => {
        if (active) setPromisesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isEdit, customerId, requestedCustomer, requestedPromise, existing]);

  if (loading || customersLoading) {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <p>Loading payment details...</p>
        </div>
      </section>
    );
  }

  if (notFound || (isEdit && (!paymentId || !existing))) {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <strong>{error ? "Payment unavailable" : "Payment not found"}</strong>
          <p>{error || "This payment may not exist or may already have been voided."}</p>
          <Link to="/payments" className="secondary-button">
            Back to payments
          </Link>
        </div>
      </section>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setFieldErrors({});

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !method) {
      setError("Enter a valid amount and payment method.");
      return;
    }

    if (!date || date > beirutToday()) {
      setError("Payment date cannot be later than today in Beirut.");
      return;
    }

    const selectedPromise = promises.find((promise) => String(promise.id) === promiseId);
    if (!selectedPromise) {
      setError("Choose the payment promise this payment belongs to.");
      return;
    }
    if (selectedPromise && numericAmount > Number(selectedPromise.remaining_amount)) {
      setError("Payment exceeds the selected promise's remaining balance.");
      setFieldErrors({ amount: `Enter no more than $${selectedPromise.remaining_amount} for this promise.` });
      return;
    }

    try {
      setSaving(true);
      setError("");

      const input = {
        amount: numericAmount,
        date,
        method,
        note,
        paymentPromiseId: selectedPromise!.id,
      };

      if (existing) {
        await updatePayment(existing.id, input);
        setSaveFeedback("Payment changes saved.");
      } else {
        const fingerprint = JSON.stringify({ ...input, note: input.note.trim(), paymentPromiseId: selectedPromise!.id });
        if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, key: crypto.randomUUID() };
        await addPayment({
          ...input,
          paymentPromiseId: selectedPromise!.id,
          idempotencyKey: submission.current.key,
        });
        setSaveFeedback("Payment recorded.");
      }

      navigate("/payments");
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(e.fields);
      setError(e instanceof Error ? e.message : "Could not save the payment.");
    } finally {
      setSaving(false);
    }
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
            {isEdit
              ? "Update the payment details."
              : "Log a customer payment received in the system."}
          </p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-section-header">
          <h2>Payment details</h2>
          <p>Add the customer, amount, and payment date for the received funds.</p>
        </div>

        {(error || customerError) && (
          <div className="customer-empty" role="alert">
            {error || customerError}
            {Object.keys(fieldErrors).length > 0 && (
              <ul>
                {Object.entries(fieldErrors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="payment-customer">Customer</label>
            <select
              id="payment-customer"
              value={customerId}
              required
              onChange={(event) => {
                setCustomerId(event.target.value);
                setPromiseId("");
                setPromises([]);
                setFieldErrors({});
              }}
            >
              <option value="" disabled>Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={String(customer.id)}>
                  {customer.name}
                </option>
              ))}
            </select>
            {isEdit && <small>Changing the promise reallocates this payment; the API validates both balances.</small>}
          </div>

          <div className="form-group">
              <label htmlFor="payment-promise">Payment promise</label>
              <select id="payment-promise" value={promiseId} required
                disabled={!customerId || promisesLoading || promises.length === 0}
                aria-invalid={!!fieldErrors.payment_promise}
                onChange={(event) => { setPromiseId(event.target.value); setFieldErrors({}); setError(""); }}>
                <option value="" disabled>{promisesLoading ? "Loading promises..." : "Select payment promise"}</option>
                {promises.map((promise) => <option key={promise.id} value={String(promise.id)}>{promise.label}</option>)}
              </select>
              <small>Choose the installment received. The payment cannot exceed the available amount (including this payment when editing).</small>
            </div>

          <div className="form-group">
            <label htmlFor="payment-amount">Amount (USD)</label>
            <input
              id="payment-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              required
              aria-invalid={!!fieldErrors.amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="payment-date">Payment date</label>
            <input
              id="payment-date"
              type="date"
              max={beirutToday()}
              value={date}
              required
              aria-invalid={!!fieldErrors.paid_on}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="payment-method">Method</label>
            <select
              id="payment-method"
              value={method}
              required
              aria-invalid={!!fieldErrors.method}
              onChange={(event) =>
                setMethod(event.target.value as PaymentMethod | "")
              }
            >
              <option value="" disabled>Select method</option>
              {paymentMethods.map((item) => (
                <option key={item} value={item}>
                  {methodLabels[item]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="payment-note">Note (optional)</label>
            <textarea
              id="payment-note"
              value={note}
              rows={3}
              placeholder="Add a payment note"
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        {!isEdit && customerId && !promisesLoading && promises.length === 0 && (
          <p role="alert">
            This customer has no eligible payment promise. Create a promise
            before recording this payment.
          </p>
        )}

        <div className="form-actions">
          <Link to="/payments" className="secondary-button form-button">
            Cancel
          </Link>
          <button
            type="submit"
            className="primary-button"
            disabled={
              saving ||
              (!customerId || promisesLoading || !promiseId)
            }
          >
            {saving
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Save payment"}
          </button>
        </div>
      </form>
    </section>
  );
}
