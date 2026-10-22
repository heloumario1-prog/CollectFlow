import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  archiveCustomerById,
  getCustomerById,
  type ApiCustomer,
} from "../data/customers";
import { EntityModal } from "../components/EntityModal";

const money = (value: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value));

export function CustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<ApiCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    getCustomerById(id)
      .then((data) => {
        if (active) setCustomer(data);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Could not load customer.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function handleArchive() {
    if (!id) return;
    setArchiving(true);
    setArchiveError("");
    try {
      await archiveCustomerById(id);
      navigate("/customers");
    } catch (e) {
      setArchiveError(
        e instanceof Error ? e.message : "Could not archive the customer.",
      );
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <section className="content-page">
        <div className="content-panel">Loading...</div>
      </section>
    );
  }

  if (!customer) {
    return (
      <section className="content-page">
        <Link to="/customers" className="back-link">
          ← Back to customers
        </Link>
        <div className="content-panel">
          <strong>Customer not found</strong>
          <p>{error || "This customer does not exist."}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="content-page">
      <div className="customer-details-header">
        <div>
          <Link to="/customers" className="back-link">
            ← Back to customers
          </Link>
          <div className="customer-title">
            <div className="large-customer-avatar">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1>{customer.name}</h1>
              <p className="page-description">{customer.phone_e164}</p>
            </div>
          </div>
        </div>

        <div className="customer-actions">
          <Link
            to={`/customers/${customer.id}/edit`}
            className="secondary-button"
          >
            Edit customer
          </Link>
          <button
            type="button"
            className="danger-button"
            onClick={() => setConfirming(true)}
          >
            Archive customer
          </button>
        </div>
      </div>

      <div className="customer-stats-grid">
        <article className="stat-card">
          <span>Receivables</span>
          <strong>{customer.total_receivables}</strong>
          <small>Active receivables</small>
        </article>
        <article className="stat-card">
          <span>Paid</span>
          <strong>{money(customer.total_paid)}</strong>
          <small>Total payments received</small>
        </article>
        <article className="stat-card">
          <span>Outstanding</span>
          <strong>{money(customer.total_remaining)}</strong>
          <small>Remaining balance</small>
        </article>
      </div>

      <div className="content-panel">
        <h2>Customer details</h2>
        <div className="details-list">
          <div className="details-item">
            <span>Phone</span>
            <strong>{customer.phone_e164}</strong>
          </div>
          <div className="details-item">
            <span>Email</span>
            <strong>{customer.email || "—"}</strong>
          </div>
          <div className="details-item">
            <span>Notes</span>
            <strong>{customer.notes || "—"}</strong>
          </div>
          <div className="details-item">
            <span>Next follow-up</span>
            <strong>{customer.next_follow_up_on || "—"}</strong>
          </div>
          <div className="details-item">
            <span>Added on</span>
            <strong>{new Date(customer.created_at).toLocaleDateString()}</strong>
          </div>
        </div>
      </div>

      {confirming && (
        <EntityModal
          title="Archive customer?"
          description={`Archive ${customer.name}? They will be hidden from the customer list. A customer with an unpaid balance cannot be archived.`}
          onClose={() => setConfirming(false)}
        >
          {archiveError && (
            <p style={{ color: "#b42318", fontSize: 12 }}>{archiveError}</p>
          )}
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleArchive}
              disabled={archiving}
            >
              {archiving ? "Archiving..." : "Archive customer"}
            </button>
          </div>
        </EntityModal>
      )}
    </section>
  );
}