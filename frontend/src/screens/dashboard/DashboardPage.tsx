
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import type { UserRead } from "../../type/auth";
import type { BusinessRead } from "../../type/business";
import { listCustomers, type ApiCustomer } from "../../data/customers";
import { listReceivables, type ApiReceivable } from "../../data/receivables";
import { getPayments, type Payment } from "../../data/payments";

type DashboardData = {
  customers: ApiCustomer[];
  receivables: ApiReceivable[];
  payments: Payment[];
};

const stats = [
  { label: "Total receivables", caption: "Current outstanding balance" },
  { label: "Collected this month", caption: "Completed payments received" },
  { label: "Due this week", caption: "Outstanding balances due this week" },
  { label: "Follow-ups", caption: "Customers to contact" },
];

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function Panel({
  eyebrow,
  title,
  to,
  children,
}: {
  eyebrow: string;
  title: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-panel" aria-label={title}>
      <div className="app-panel-heading">
        <div>
          <p className="app-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <Link to={to}>
          View all <span aria-hidden="true">↗</span>
        </Link>
      </div>
      {children}
    </section>
  );
}

export function DashboardPage() {
  const { user } = useOutletContext<{
    user: UserRead;
    business: BusinessRead;
  }>();

  const [data, setData] = useState<DashboardData>({
    customers: [],
    receivables: [],
    payments: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setError("");

        const [customers, receivables, payments] = await Promise.all([
          listCustomers(),
          listReceivables(),
          getPayments(),
        ]);

        if (!cancelled) {
          setData({ customers, receivables, payments });
        }
      } catch {
        if (!cancelled) {
          setError(
            "We couldn't load dashboard data. Please check your connection and try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user.full_name.trim().split(/\s+/)[0] || "there";

  const today = localDateString(new Date());
  const currentDate = new Date();
  const monthStart = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1,
  ).padStart(2, "0")}`;

  // The current calendar week runs from Monday through Sunday.
  const monday = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );
  const dayOfWeek = monday.getDay();
  monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = localDateString(monday);
  const weekEnd = localDateString(sunday);

  const activeReceivables = data.receivables.filter(
    (item) => !item.archived_at,
  );

  const totalOutstanding = activeReceivables.reduce(
    (total, item) => total + Math.max(0, Number(item.remaining_amount) || 0),
    0,
  );

  const collectedThisMonth = data.payments
    .filter(
      (payment) =>
        payment.status === "Completed" &&
        payment.date.slice(0, 7) === monthStart,
    )
    .reduce((total, payment) => total + payment.amount, 0);

  const dueThisWeek = activeReceivables
    .filter(
      (item) =>
        item.due_date >= weekStart &&
        item.due_date <= weekEnd &&
        Number(item.remaining_amount) > 0,
    )
    .reduce(
      (total, item) => total + (Number(item.remaining_amount) || 0),
      0,
    );

  const customersNeedingFollowUp = data.customers.filter(
    (customer) =>
      !customer.archived_at &&
      customer.next_follow_up_on !== null &&
      customer.next_follow_up_on <= today,
  );

  const upcomingCustomers = data.customers
    .filter(
      (customer) =>
        !customer.archived_at &&
        customer.next_follow_up_on !== null &&
        customer.next_follow_up_on >= today &&
        customer.next_follow_up_on <= weekEnd,
    )
    .sort((a, b) =>
      (a.next_follow_up_on ?? "").localeCompare(b.next_follow_up_on ?? ""),
    )
    .slice(0, 5);

  const recentCustomers = [...data.customers]
    .filter((customer) => !customer.archived_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  const statValues = [
    formatMoney(totalOutstanding),
    formatMoney(collectedThisMonth),
    formatMoney(dueThisWeek),
    String(customersNeedingFollowUp.length),
  ];

  return (
    <div className="dashboard-page">
      <div className="app-page-heading">
        <div>
          <p className="app-eyebrow">OVERVIEW</p>
          <h1>
            Welcome back, {firstName}
            <span className="app-heading-period">.</span>
          </h1>
          <p>
            Here is your workspace for receivables and customer follow-ups.
          </p>
        </div>

        <Link to="/customers/new" className="app-primary-button">
          <span aria-hidden="true">+</span> Add customer
        </Link>
      </div>

      <div className="app-section-heading">
        <div>
          <h2>At a glance</h2>
          <p>Your collection picture in one place.</p>
        </div>
        <span className="app-period-label">THIS MONTH</span>
      </div>

      {error && (
        <div role="alert" className="app-action-error">
          <p>{error}</p>
          <button
            type="button"
            className="app-primary-button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      )}

      <section className="app-stats" aria-label="Collection statistics">
        {stats.map((stat, index) => (
          <article key={stat.label} className="app-stat-card">
            <span className="app-stat-top">
              <span>{stat.label}</span>
              <span className="app-stat-number">
                0{index + 1}
              </span>
            </span>

            <strong>
              {loading ? "Loading..." : error ? "—" : statValues[index]}
            </strong>

            <small>{stat.caption}</small>
          </article>
        ))}
      </section>

      <p className="app-data-note">
        {loading
          ? "Loading your business data..."
          : error
            ? "Dashboard figures are unavailable until the data loads successfully."
            : "Figures are calculated from your current business records."}
      </p>

      <div className="app-panels">
        <Panel
          eyebrow="CUSTOMERS"
          title="Recent customers"
          to="/customers"
        >
          {loading ? (
            <div className="app-panel-empty">
              <p>Loading customers...</p>
            </div>
          ) : error ? (
            <div className="app-panel-empty">
              <p>Customer data is unavailable.</p>
            </div>
          ) : recentCustomers.length === 0 ? (
            <div className="app-panel-empty">
              <strong>No customers yet</strong>
              <p>Add a customer to start managing receivables.</p>
            </div>
          ) : (
            <div>
              {recentCustomers.map((customer) => (
                <div
                  key={customer.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border-color, #e5e7eb)",
                  }}
                >
                  <div>
                    <strong>{customer.name}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "13px" }}>
                      {customer.phone_e164}
                    </p>
                  </div>
                  <small>{formatDate(customer.created_at)}</small>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          eyebrow="FOLLOW-UPS"
          title="Upcoming follow-ups"
          to="/follow-ups"
        >
          {loading ? (
            <div className="app-panel-empty">
              <p>Loading follow-up schedules...</p>
            </div>
          ) : error ? (
            <div className="app-panel-empty">
              <p>Follow-up data is unavailable.</p>
            </div>
          ) : upcomingCustomers.length === 0 ? (
            <div className="app-panel-empty">
              <strong>No follow-ups scheduled this week</strong>
              <p>
                Customers with a next follow-up date this week will appear here.
              </p>
            </div>
          ) : (
            <div>
              {upcomingCustomers.map((customer) => (
                <div
                  key={customer.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border-color, #e5e7eb)",
                  }}
                >
                  <div>
                    <strong>{customer.name}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "13px" }}>
                      {customer.phone_e164}
                    </p>
                  </div>
                  <small>{formatDate(customer.next_follow_up_on!)}</small>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
