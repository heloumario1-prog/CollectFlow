
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { EntityModal } from "../components/EntityModal";
import { getFollowUps, type FollowUp } from "../data/follow-ups";
import { SaveFeedback } from "../components/SaveFeedback";

export function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFollowUp, setSelectedFollowUp] =
    useState<FollowUp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFollowUps() {
      try {
        setError("");
        const data = await getFollowUps();

        if (!cancelled) {
          setFollowUps(data);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load follow-ups. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFollowUps();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredFollowUps = followUps.filter((followUp) =>
    followUp.customer.toLowerCase().includes(search.toLowerCase()),
  );

  const displayDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Invalid date";
    }

    return parsedDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const withReceivable = followUps.filter(
    (followUp) => followUp.receivableId !== null,
  ).length;

  return (
    <section className="content-page">
      <div className="page-header-row">
        <div>
          <p className="eyebrow">FOLLOW-UPS</p>
          <h1>Follow-ups</h1>
          <p className="page-description">
            Record and review customer payment follow-up contacts.
          </p>
        </div>

        <Link to="/follow-ups/new" className="primary-button">
          + Record Follow-up
        </Link>
      </div>

      <SaveFeedback />

      <div className="follow-up-summary">
        <article className="stat-card">
          <span>Total contacts</span>
          <strong>{followUps.length}</strong>
          <small>Recorded follow-up contacts</small>
        </article>

        <article className="stat-card">
          <span>Linked to receivables</span>
          <strong>{withReceivable}</strong>
          <small>Contacts linked to a receivable</small>
        </article>

        <article className="stat-card">
          <span>General contacts</span>
          <strong>{followUps.length - withReceivable}</strong>
          <small>Contacts without a linked receivable</small>
        </article>
      </div>

      <div className="content-panel follow-ups-panel">
        <div className="follow-ups-toolbar">
          <div className="follow-ups-toolbar-title">
            <strong>Follow-up history</strong>
            <span>{filteredFollowUps.length} records shown</span>
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
          </div>
        </div>

        {loading && (
          <div className="customer-empty">
            <p>Loading follow-ups...</p>
          </div>
        )}

        {!loading && error && (
          <div className="customer-empty">
            <strong>{error}</strong>
            <button
              type="button"
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="follow-up-table-header">
              <span>Customer</span>
              <span>Receivable</span>
              <span>Contact date</span>
              <span>Notes</span>
              <span>Actions</span>
            </div>

            <div className="follow-up-list">
              {filteredFollowUps.map((followUp) => (
                <div className="follow-up-row" key={followUp.id}>
                  <div className="follow-up-customer">
                    <span className="follow-up-cell-label">Customer</span>

                    <div className="customer-avatar">
                      {followUp.customer.charAt(0)}
                    </div>

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
                    <span className="follow-up-cell-label">Contact date</span>
                    <strong>{displayDate(followUp.date)}</strong>
                  </div>

                  <div className="follow-up-cell">
                    <span className="follow-up-cell-label">Notes</span>
                    <strong>{followUp.notes || "No notes"}</strong>
                  </div>

                  <div className="follow-up-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setSelectedFollowUp(followUp)}
                    >
                      View
                    </button>

                    <Link
                      to={`/follow-ups/${followUp.id}/edit`}
                      className="secondary-button"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}

              {filteredFollowUps.length === 0 && (
                <div className="customer-empty">
                  <strong>No follow-ups found</strong>
                  <p>
                    {search
                      ? "Try a different customer name."
                      : "Record your first customer follow-up to see it here."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {selectedFollowUp && (
        <EntityModal
          title="Follow-up details"
          description={`${selectedFollowUp.customer} · ${displayDate(selectedFollowUp.date)}`}
          onClose={() => setSelectedFollowUp(null)}
        >
          <div className="entity-modal-details">
            <div>
              <span>Customer</span>
              <strong>{selectedFollowUp.customer}</strong>
            </div>

            <div>
              <span>Receivable</span>
              <strong>{selectedFollowUp.receivable}</strong>
            </div>

            <div>
              <span>Contact date</span>
              <strong>{displayDate(selectedFollowUp.date)}</strong>
            </div>

            <div>
              <span>Recorded by</span>
              <strong>{selectedFollowUp.createdBy || "Unknown"}</strong>
            </div>

            <div>
              <span>Notes</span>
              <strong>{selectedFollowUp.notes || "No notes"}</strong>
            </div>
          </div>

          <div className="entity-modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedFollowUp(null)}
            >
              Close
            </button>

            <Link
              to={`/follow-ups/${selectedFollowUp.id}/edit`}
              className="primary-button"
            >
              Edit
            </Link>
          </div>
        </EntityModal>
      )}
    </section>
  );
}
