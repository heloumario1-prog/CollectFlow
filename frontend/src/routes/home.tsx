import { Link } from "react-router";

export async function homeLoader() {
  return null;
}

export async function homeAction() {
  return null;
}

export function HomePage() {
  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Good morning, Mario</h1>
          <p className="page-description">
            Here is an overview of your receivables and customer follow-ups.
          </p>
        </div>

        <Link to="/customers/new" className="primary-button">
          + Add customer
        </Link>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Total receivables</span>
          <strong>$24,580</strong>
          <small>Current outstanding balance</small>
        </article>

        <article className="stat-card">
          <span>Collected this month</span>
          <strong>$8,420</strong>
          <small>Payments received</small>
        </article>

        <article className="stat-card">
          <span>Due this week</span>
          <strong>$3,240</strong>
          <small>Upcoming payments</small>
        </article>

        <article className="stat-card">
          <span>Follow-ups</span>
          <strong>12</strong>
          <small>Customers to contact</small>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">CUSTOMERS</p>
              <h2>Recent customers</h2>
            </div>

            <Link to="/customers" className="text-button">
              View all
            </Link>
          </div>

          <div className="empty-state">
            <div className="empty-icon">+</div>
            <strong>No customer activity yet</strong>
            <p>
              Customer information will appear here once it is available.
            </p>
          </div>
        </section>

        <section className="dashboard-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">FOLLOW-UPS</p>
              <h2>Upcoming follow-ups</h2>
            </div>

            <Link to="/follow-ups" className="text-button">
              View all
            </Link>
          </div>

          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <strong>No follow-ups scheduled</strong>
            <p>
              Upcoming customer follow-ups will appear here.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}