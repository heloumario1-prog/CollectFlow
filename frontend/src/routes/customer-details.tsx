import { customerService } from "../screens/customers/service";
import { StatusBadge } from "../components/StatusBadge";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  archiveCustomerById,
  getCustomerById,
  type ApiCustomer,
} from "../data/customers";
import { EntityModal } from "../components/EntityModal";
import { customerHistory } from "../screens/customers/history";

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
  const [history, setHistory] = useState<Awaited<ReturnType<typeof customerHistory>> | null>(null);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setHistory(null);
    setHistoryError("");
    customerHistory(id, controller.signal).then(setHistory).catch(error => {
      if (!controller.signal.aborted) setHistoryError(error instanceof Error ? error.message : "History is unavailable.");
    });
    return () => controller.abort();
  }, [id]);

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
      if (customer?.archived_at) {
        await customerService.restore(id);
        setCustomer(await getCustomerById(id));
      } else {
        await archiveCustomerById(id);
        navigate("/customers");
      }
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
              <StatusBadge status={customer.archived_at ? "Archived" : "Active"} />
              <p className="page-description">{customer.phone_e164}</p>
            </div>
          </div>
        </div>

        <div className="customer-actions">
          <a href={customer.whatsapp_url} target="_blank" rel="noopener noreferrer" className="secondary-button">Open WhatsApp</a>
          {!customer.archived_at && <Link
            to={`/customers/${customer.id}/edit`}
            className="secondary-button"
          >
            Edit customer
          </Link>}
          <button
            type="button"
            className="danger-button"
            onClick={() => customer.archived_at ? void handleArchive() : setConfirming(true)}
            disabled={archiving}
          >
            {archiving ? "Saving..." : customer.archived_at ? "Restore customer" : "Archive customer"}
          </button>
        </div>
      </div>

      {archiveError && <p role="alert">{archiveError}</p>}
      <div className="customer-stats-grid">
        <article className="stat-card">
          <span>Receivables</span>
          <strong>{customer.total_receivables}</strong>
          <small>Active receivables</small>
        </article>
        <article className="stat-card">
          <span>Paid</span>
          <strong>{money(customer.total_paid)}</strong>
          <small>Payments on active receivables</small>
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
            <strong>{new Date(customer.created_at).toLocaleDateString("en-US", { timeZone: "Asia/Beirut" })}</strong>
          </div>
        </div>
      </div>

      <section className="content-panel customer-history" aria-label="Customer history">
        <h2>Customer history</h2>
        {historyError ? <p role="alert">{historyError}</p> : !history ? <p role="status">Loading history...</p> : <>
          <h3>Receivables</h3>
          {history.receivables.length ? history.receivables.map(item => <div className="history-row" key={item.id}><strong>{item.reference || `Receivable #${item.id}`}</strong><span>Due {item.due_date}</span><span>{money(item.remaining_amount)} remaining</span><StatusBadge status={item.archived_at ? "Archived" : item.status} /></div>) : <p>No receivables yet.</p>}
          <h3>Payment promises</h3>
          {history.promises.length ? history.promises.map(item => <div className="history-row" key={item.id}><strong>Promise #{item.id}</strong><span>Due {item.promised_on}</span><span>{money(item.remaining_amount)} remaining</span><StatusBadge status={item.status} />{item.cancel_reason && <p>Cancellation reason: {item.cancel_reason}</p>}</div>) : <p>No payment promises yet.</p>}
          <h3>Payments</h3>
          {history.payments.length ? history.payments.map(item => <div className="history-row" key={item.id}><strong>{money(item.amount)}</strong><span>{item.paid_on}</span><span>{item.method === "CASH" ? "Cash" : "Whish"}</span><StatusBadge status={item.is_voided ? "Voided" : "Recorded"} />{item.void_reason && <p>Void reason: {item.void_reason}</p>}</div>) : <p>No payments yet.</p>}
          <h3>Follow-ups</h3>
          {history.followUps.length ? history.followUps.map(item => <div className="history-row" key={item.id}><time>{new Date(item.occurred_at).toLocaleString("en-US", { timeZone: "Asia/Beirut" })}</time><StatusBadge status={item.completed_at ? "Completed" : "Pending"} /><p>{item.note}</p></div>) : <p>No follow-up notes yet.</p>}
        </>}
      </section>

      {confirming && (
        <EntityModal
          title="Archive customer?"
          description={`Archive ${customer.name}? Find them later under Customers → Show → Archived customers, where you can restore them. A customer with an unpaid balance cannot be archived.`}
          onClose={() => { if (!archiving) setConfirming(false); }}
        >
          {archiveError && (
            <p style={{ color: "var(--cf-danger)", fontSize: 12 }}>{archiveError}</p>
          )}
          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={archiving}
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
