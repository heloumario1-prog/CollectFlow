import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError } from "../api/client";
import {
  createCustomer,
  getCustomerById,
  updateCustomerById,
} from "../data/customers";

const countries = [{ code: "LB", name: "Lebanon" }];

const errorStyle = { color: "#b42318", fontSize: "11px", margin: 0 };

function CustomerForm({ customerId }: { customerId?: string }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("LB");
  const [phone, setPhone] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [loading, setLoading] = useState(Boolean(customerId));
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!customerId) return;
    let active = true;
    getCustomerById(customerId)
      .then((customer) => {
        if (!active) return;
        setName(customer.name);
        setPhone(customer.phone_e164);
        setOriginalPhone(customer.phone_e164);
        setEmail(customer.email ?? "");
        setNotes(customer.notes ?? "");
        setNextFollowUp(customer.next_follow_up_on ?? "");
      })
      .catch((e) => {
        if (!active) return;
        setLoadFailed(true);
        setError(e instanceof Error ? e.message : "Could not load customer.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      const input = {
        name,
        country,
        phone,
        email,
        notes,
        next_follow_up_on: nextFollowUp,
      };
      if (customerId) {
        await updateCustomerById(
          customerId,
          input,
          phone.trim() !== originalPhone,
        );
      } else {
        await createCustomer(input);
      }
      navigate("/customers");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setFieldErrors(e.fields);
      } else {
        setError("Could not save the customer.");
      }
    } finally {
      setSaving(false);
    }
  }

  const phoneError =
    fieldErrors.phone ??
    fieldErrors.phone_e164 ??
    fieldErrors.phone_national_number;

  return (
    <section className="content-page">
      <div>
        <Link to="/customers" className="back-link">
          ← Back to customers
        </Link>
        <p className="eyebrow">CUSTOMERS</p>
        <h1>{customerId ? "Edit customer" : "Add customer"}</h1>
      </div>

      {loading ? (
        <div className="form-card">Loading...</div>
      ) : loadFailed ? (
        <div className="form-card">
          <strong>Customer not found</strong>
          <p style={errorStyle}>{error}</p>
        </div>
      ) : (
        <form className="form-card" onSubmit={handleSubmit}>
          {error && <p style={{ ...errorStyle, marginBottom: 16 }}>{error}</p>}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="customer-name">Name</label>
              <input
                id="customer-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              {fieldErrors.name && <p style={errorStyle}>{fieldErrors.name}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="customer-country">Country</label>
              <select
                id="customer-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                {countries.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="customer-phone">Phone number</label>
              <input
                id="customer-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="70 123 456 or +96170123456"
                required
              />
              {phoneError && <p style={errorStyle}>{phoneError}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="customer-email">Email (optional)</label>
              <input
                id="customer-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {fieldErrors.email && (
                <p style={errorStyle}>{fieldErrors.email}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="customer-follow-up">Next follow-up (optional)</label>
              <input
                id="customer-follow-up"
                type="date"
                value={nextFollowUp}
                onChange={(event) => setNextFollowUp(event.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="customer-notes">Notes (optional)</label>
              <textarea
                id="customer-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <Link to="/customers" className="secondary-button">
              Cancel
            </Link>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving..." : customerId ? "Save changes" : "Add customer"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function AddCustomerPage() {
  return <CustomerForm />;
}

export function EditCustomerPage() {
  const { id } = useParams();
  return <CustomerForm customerId={id} />;
}