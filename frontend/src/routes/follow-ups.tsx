import { useState } from "react";
import { Link } from "react-router";
import { EntityModal } from "../components/EntityModal";
import {
  deleteFollowUp,
  getFollowUps,
  type FollowUp,
  updateFollowUp,
} from "../data/follow-ups";
import { SaveFeedback } from "../components/SaveFeedback";

export function FollowUpsPage() {
  const [followUps, setFollowUps] = useState(getFollowUps);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const filteredFollowUps = followUps.filter((followUp) => {
    const matchesSearch = followUp.customer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || followUp.status === statusFilter;
    const matchesMethod = methodFilter === "All" || followUp.method === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const refreshFollowUps = () => setFollowUps(getFollowUps());
  const statusClass = (status: FollowUp["status"]) =>
    status.toLowerCase().replaceAll(" ", "-");
  const displayDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <section className="content-page">
      <div className="page-header-row">
        <div>
          <p className="eyebrow">FOLLOW-UPS</p>
          <h1>Follow-ups</h1>
          <p className="page-description">
            Track and manage customer payment follow-ups.
          </p>
        </div>
        <Link to="/follow-ups/new" className="primary-button">
          + Add Follow-up
        </Link>
      </div>

      <SaveFeedback />

      <div className="follow-up-summary">
        {(["Due Today", "Upcoming", "Overdue", "Completed"] as const).map((status) => {
          const count = followUps.filter((followUp) => followUp.status === status).length;
          return (
            <article className="stat-card" key={status}>
              <span>{status}</span>
              <strong>{count}</strong>
              <small>{status === "Completed" ? "Follow-ups completed" : "Follow-ups scheduled"}</small>
            </article>
          );
        })}
      </div>

      <div className="content-panel follow-ups-panel">
        <div className="follow-ups-toolbar">
          <div className="follow-ups-toolbar-title">
            <strong>Follow-up schedule</strong>
            <span>{filteredFollowUps.length} follow-ups shown</span>
          </div>
          <div className="follow-ups-filters">
            <input
              className="customer-search"
              type="search"
              placeholder="Search customers..."
              aria-label="Search by customer"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="status-filter"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Due Today">Due Today</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
            </select>
            <select
              className="status-filter"
              aria-label="Filter by contact method"
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value)}
            >
              <option value="All">All methods</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Phone Call">Phone Call</option>
              <option value="SMS">SMS</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="follow-up-table-header" aria-hidden="true">
          <span>Customer</span>
          <span>Receivable</span>
          <span>Due Date</span>
          <span>Contact Method</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        <div className="follow-up-list">
          {filteredFollowUps.map((followUp) => (
            <div className="follow-up-row" key={followUp.id}>
              <div className="follow-up-customer">
                <span className="follow-up-cell-label">Customer</span>
                <div className="customer-avatar">{followUp.customer.charAt(0)}</div>
                <Link
                  to={`/customers/${followUp.customerId}`}
                  className="customer-name-link"
                >
                  {followUp.customer}
                </Link>
              </div>
              <div className="follow-up-cell">
                <span className="follow-up-cell-label">Receivable</span>
                <strong>{followUp.receivable}</strong>
              </div>
              <div className="follow-up-cell">
                <span className="follow-up-cell-label">Due Date</span>
                <strong>{displayDate(followUp.date)}</strong>
              </div>
              <div className="follow-up-cell">
                <span className="follow-up-cell-label">Contact Method</span>
                <strong>{followUp.method}</strong>
              </div>
              <span className={`status-badge follow-up-status ${statusClass(followUp.status)}`}>
                {followUp.status}
              </span>
              <div className="follow-up-actions">
                <button type="button" className="secondary-button" onClick={() => setSelectedFollowUp(followUp)}>
                  View
                </button>
                <Link to={`/follow-ups/${followUp.id}/edit`} className="secondary-button">
                  Edit
                </Link>
                {followUp.status !== "Completed" && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      updateFollowUp(followUp.id, { ...followUp, status: "Completed" });
                      refreshFollowUps();
                    }}
                  >
                    Mark completed
                  </button>
                )}
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    setSelectedFollowUp(followUp);
                    setConfirmingDelete(true);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {filteredFollowUps.length === 0 && (
            <div className="customer-empty">
              <strong>No follow-ups found</strong>
              <p>Try changing the search or filters to see more results.</p>
            </div>
          )}
        </div>
      </div>

      {selectedFollowUp && !confirmingDelete && (
        <EntityModal
          title="Follow-up details"
          description={`${selectedFollowUp.customer} · ${displayDate(selectedFollowUp.date)}`}
          onClose={() => setSelectedFollowUp(null)}
        >
          <div className="entity-modal-details">
            <div><span>Customer</span><strong>{selectedFollowUp.customer}</strong></div>
            <div><span>Receivable</span><strong>{selectedFollowUp.receivable}</strong></div>
            <div><span>Due date</span><strong>{displayDate(selectedFollowUp.date)}</strong></div>
            <div><span>Contact method</span><strong>{selectedFollowUp.method}</strong></div>
            <div><span>Status</span><strong>{selectedFollowUp.status}</strong></div>
            <div><span>Notes</span><strong>{selectedFollowUp.notes || "No notes"}</strong></div>
          </div>
          <div className="entity-modal-actions">
            <button type="button" className="secondary-button" onClick={() => setSelectedFollowUp(null)}>
              Close
            </button>
          </div>
        </EntityModal>
      )}

      {selectedFollowUp && confirmingDelete && (
        <EntityModal
          title="Delete follow-up?"
          description={`Delete the follow-up for ${selectedFollowUp.customer}? This action cannot be undone.`}
          onClose={() => setConfirmingDelete(false)}
        >
          <div className="entity-modal-actions">
            <button type="button" className="secondary-button" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                deleteFollowUp(selectedFollowUp.id);
                refreshFollowUps();
                setConfirmingDelete(false);
                setSelectedFollowUp(null);
              }}
            >
              Delete follow-up
            </button>
          </div>
        </EntityModal>
      )}
    </section>
  );
}
