import { Link, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { EntityModal } from "../components/EntityModal";
import { deleteCustomer, getCustomer } from "../data/customers";
import { deleteReceivablesForCustomer, getReceivables } from "../data/receivables";
import { deletePaymentsForCustomer } from "../data/payments";
import { SaveFeedback } from "../components/SaveFeedback";

export function CustomerDetailsPage() {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const { customerId } = useParams();
  const navigate = useNavigate();
  const customer = customerId ? getCustomer(customerId) : undefined;

  if (!customer || !customerId) {
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

  const customerReceivables = getReceivables().filter(
    (receivable) => receivable.customerId === customerId,
  );
  const totalReceivables = customerReceivables.reduce(
    (total, receivable) => total + receivable.originalAmount,
    0,
  );
  const outstanding = customerReceivables.reduce(
    (total, receivable) => total + receivable.outstanding,
    0,
  );
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <section className="content-page">
      <div className="customer-details-header">
        <div>
          <Link to="/customers" className="back-link">
            ← Back to customers
          </Link>

          <div className="customer-title">
            <div className="large-customer-avatar">
              {customer.name.charAt(0)}
            </div>

            <div>
              <p className="eyebrow">CUSTOMER</p>
              <h1>{customer.name}</h1>
              <p className="page-description">
                {customer.country} • {customer.phone}
              </p>
            </div>
          </div>
        </div>

        <div className="customer-actions">
          <Link to={`/customers/${customerId}/edit`} className="secondary-button">
            Edit
          </Link>

          <button
            type="button"
            className="danger-button"
            onClick={() => setShowDeleteConfirmation(true)}
          >
            Delete customer
          </button>

          <Link
            to={`/customers/${customerId}/receivables/new`}
            className="primary-button"
          >
            + Add receivable
          </Link>
        </div>
      </div>

      <SaveFeedback />

      {showDeleteConfirmation && (
        <EntityModal
          title="Delete customer?"
          description={`Are you sure you want to delete ${customer.name}? This action cannot be undone.`}
          onClose={() => setShowDeleteConfirmation(false)}
        >
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowDeleteConfirmation(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                deleteReceivablesForCustomer(customerId);
                deletePaymentsForCustomer(customerId);
                deleteCustomer(customerId);
                navigate("/customers");
              }}
            >
              Delete customer
            </button>
          </div>
        </EntityModal>
      )}

      <div className="customer-stats-grid">
        <article className="stat-card">
          <span>Outstanding balance</span>
          <strong>{formatCurrency(outstanding)}</strong>
          <small>Current amount due</small>
        </article>

        <article className="stat-card">
          <span>Total receivables</span>
          <strong>{formatCurrency(totalReceivables)}</strong>
          <small>Total credit provided</small>
        </article>

        <article className="stat-card">
          <span>Total paid</span>
          <strong>{formatCurrency(totalReceivables - outstanding)}</strong>
          <small>Payments received</small>
        </article>
      </div>

      <div className="customer-details-grid">
        <section className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">INFORMATION</p>
              <h2>Customer information</h2>
            </div>
          </div>

          <div className="details-list">
            <div className="details-item">
              <span>Full name</span>
              <strong>{customer.name}</strong>
            </div>

            <div className="details-item">
              <span>Phone number</span>
              <strong>{customer.phone}</strong>
            </div>

            <div className="details-item">
              <span>Email</span>
              <strong>{customer.email}</strong>
            </div>

            <div className="details-item">
              <span>Address</span>
              <strong>{customer.address}</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">ACTIVITY</p>
              <h2>Recent activity</h2>
            </div>
          </div>

          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">P</div>
              <div>
                <strong>Payment received</strong>
                <span>Payment activity will appear here.</span>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-icon">R</div>
              <div>
                <strong>Receivable created</strong>
                <span>Receivable activity will appear here.</span>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-icon">F</div>
              <div>
                <strong>Follow-up scheduled</strong>
                <span>Follow-up activity will appear here.</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}