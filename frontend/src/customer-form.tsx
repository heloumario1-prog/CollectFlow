import { Link } from "react-router";

export function AddCustomerPage() {
  return (
    <section className="content-page">
      <div className="form-page-header">
        <div>
          <Link to="/customers" className="back-link">
            ← Back to customers
          </Link>

          <p className="eyebrow">CUSTOMERS</p>
          <h1>Add customer</h1>

          <p className="page-description">
            Enter the customer information below.
          </p>
        </div>
      </div>

      <div className="form-card">
        <div className="form-section-header">
          <h2>Customer information</h2>
          <p>
            Add the basic information needed to identify and contact
            the customer.
          </p>
        </div>

        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="customer-name">
              Customer name
            </label>

            <input
              id="customer-name"
              type="text"
              placeholder="Enter customer name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer-phone">
              Phone number
            </label>

            <input
              id="customer-phone"
              type="tel"
              placeholder="+961 70 000 000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer-email">
              Email address
            </label>

            <input
              id="customer-email"
              type="email"
              placeholder="customer@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer-country">
              Country
            </label>

            <input
              id="customer-country"
              type="text"
              placeholder="Lebanon"
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer-address">
              Address
            </label>

            <input
              id="customer-address"
              type="text"
              placeholder="Enter customer address"
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="customer-notes">
              Notes
            </label>

            <textarea
              id="customer-notes"
              placeholder="Add optional notes about this customer..."
              rows={4}
            />
          </div>
        </div>

        <div className="form-actions">
          <Link
            to="/customers"
            className="secondary-button form-button"
          >
            Cancel
          </Link>

          <button className="primary-button">
            Save customer
          </button>
        </div>
      </div>
    </section>
  );
}