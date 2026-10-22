import { Link, useActionData, useOutletContext } from "react-router";
import type { UserRead } from "../../type/auth";
import type { BusinessRead } from "../../type/business";
import type { AuthActionResult } from "../auth/action";

const stats = [
  { label: "Total receivables", caption: "Current outstanding balance" },
  { label: "Collected this month", caption: "Payments received" },
  { label: "Due this week", caption: "Upcoming payments" },
  { label: "Follow-ups", caption: "Customers to contact" },
];

function Panel({ eyebrow, title, to, icon, message, detail }: { eyebrow: string; title: string; to: string; icon: "people" | "calendar"; message: string; detail: string }) {
  return <section className="app-panel" aria-label={title}>
    <div className="app-panel-heading"><div><p className="app-eyebrow">{eyebrow}</p><h2>{title}</h2></div><Link to={to}>View all <span aria-hidden="true">↗</span></Link></div>
    <div className="app-panel-empty"><span className="app-empty-icon" aria-hidden="true">{icon === "people" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5" /></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-12 5 2 2 4-4" /></svg>}</span><strong>{message}</strong><p>{detail}</p></div>
  </section>;
}

export function DashboardPage() {
  const { user } = useOutletContext<{ user: UserRead; business: BusinessRead }>();
  const actionData = useActionData() as AuthActionResult | undefined;
  const firstName = user.full_name.trim().split(/\s+/)[0] || "there";
  return <div className="dashboard-page">
    {actionData?.formError && <p role="alert" className="app-action-error">{actionData.formError}</p>}
    <div className="app-page-heading"><div><p className="app-eyebrow">OVERVIEW</p><h1>Welcome back, {firstName}<span className="app-heading-period">.</span></h1><p>Here is your workspace for receivables and customer follow-ups.</p></div><Link to="/customers/new" className="app-primary-button"><span aria-hidden="true">+</span> Add customer</Link></div>
    <div className="app-section-heading"><div><h2>At a glance</h2><p>Your collection picture in one place.</p></div><span className="app-period-label">THIS MONTH</span></div>
    <section className="app-stats" aria-label="Collection statistics">{stats.map((stat, index) => <article key={stat.label} className="app-stat-card"><span className="app-stat-top"><span>{stat.label}</span><span className="app-stat-number">0{index + 1}</span></span><strong aria-label={`${stat.label}: not available yet`}>—</strong><small>{stat.caption}</small></article>)}</section>
    <p className="app-data-note">Collection totals will appear when dashboard records are connected.</p>
    <div className="app-panels"><Panel eyebrow="CUSTOMERS" title="Recent customers" to="/customers" icon="people" message="Customer activity is on its way" detail="Recent customer records will appear here when the customer area is connected." /><Panel eyebrow="FOLLOW-UPS" title="Upcoming follow-ups" to="/follow-ups" icon="calendar" message="Follow-up schedule is on its way" detail="Scheduled follow-ups will appear here when the follow-up area is connected." /></div>
  </div>;
}
