import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { addCustomer, getCustomer, updateCustomer } from "../data/customers";
import { setSaveFeedback } from "../data/save-feedback";

export function AddCustomerPage() {
  return <CustomerFormScreen isEdit={false} />;
}

export function EditCustomerPage() {
  return <CustomerFormScreen isEdit={true} />;
}

function CustomerFormScreen({ isEdit }: { isEdit: boolean }) {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const existing = isEdit && customerId ? getCustomer(customerId) : undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [country, setCountry] = useState(existing?.country ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  if (isEdit && !existing) {
    return (
      <section className="content-page">
        <div className="customer-empty">
          <strong>Customer not found</strong>
          <p>This customer may have been removed.</p>
          <Link to="/customers" className="secondary-button">Back to customers</Link>
        </div>
      </section>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalidRequiredField = [
      { id: "customer-name", value: name, label: "a customer name" },
      { id: "customer-phone", value: phone, label: "a phone number" },
      { id: "customer-country", value: country, label: "a country" },
    ].find((field) => !field.value.trim());
    if (invalidRequiredField) {
      const input = event.currentTarget.elements.namedItem(invalidRequiredField.id) as HTMLInputElement;
      input.setCustomValidity(`Please enter ${invalidRequiredField.label}.`);
      input.reportValidity();
      return;
    }

    const customer = { name: name.trim(), phone: phone.trim(), email: email.trim(), country: country.trim(), address: address.trim(), notes: notes.trim() };
    if (existing && customerId) {
      updateCustomer(customerId, customer);
      setSaveFeedback("Customer changes saved.");
      navigate(`/customers/${customerId}`);
    } else {
      addCustomer(customer);
      setSaveFeedback("Customer added.");
      navigate("/customers");
    }
  };

  return (
    <section className="content-page">
      <div className="form-page-header">
        <div>
          <Link to={existing ? `/customers/${customerId}` : "/customers"} className="back-link">
            ← Back to customers
          </Link>

          <p className="eyebrow">CUSTOMERS</p>
          <h1>{isEdit ? "Edit customer" : "Add customer"}</h1>

          <p className="page-description">
            {isEdit
              ? "Update the customer information below."
              : "Enter the customer information below."}
          </p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-section-header">
          <h2>Customer information</h2>
          <p>
            {isEdit
              ? "Update the basic information for this customer."
              : "Add the basic information needed to identify and contact the customer."}
          </p>
        </div>

        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="customer-name">Customer name</label>
            <input
              id="customer-name"
              type="text"
              placeholder="Enter customer name"
              value={name}
              required
              onChange={(event) => {
                event.target.setCustomValidity("");
                setName(event.target.value);
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer-phone">Phone number</label>
            <input
              id="customer-phone"
              type="tel"
              placeholder="+961 70 000 000"
              value={phone}
              pattern="[\d+\(\)\s\-]{7,}"
              title="Enter a valid phone number."
              required
              onChange={(event) => {
                event.target.setCustomValidity("");
                setPhone(event.target.value);
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer-email">Email address</label>
            <input
              id="customer-email"
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer-country">Country</label>
            <input
              id="customer-country"
              type="text"
              placeholder="Lebanon"
              value={country}
              required
              onChange={(event) => {
                event.target.setCustomValidity("");
                setCountry(event.target.value);
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer-address">Address</label>
            <input
              id="customer-address"
              type="text"
              placeholder="Enter customer address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="customer-notes">Notes</label>
            <textarea
              id="customer-notes"
              placeholder="Add optional notes about this customer..."
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <Link to={existing ? `/customers/${customerId}` : "/customers"} className="secondary-button form-button">
            Cancel
          </Link>

          <button className="primary-button" type="submit">
            {isEdit ? "Save changes" : "Save customer"}
          </button>
        </div>
      </form>
    </section>
  );
}
