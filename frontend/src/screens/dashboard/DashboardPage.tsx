import { useState } from "react";
import { Form, Link, useLoaderData, useNavigation } from "react-router";
import type { dashboardSummaryLoader } from "./loader";

const money = (amount: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount));

export function DashboardPage() {
  const data = useLoaderData<typeof dashboardSummaryLoader>();
  const [period, setPeriod] = useState(data.period.name);
  const navigation = useNavigation();
  const [from, setFrom] = useState(data.period.start);
  const metrics = data.metrics;
  const cards = [
    ["Outstanding", money(metrics.total_outstanding), "Active receivable balances"],
    ["Overdue", money(metrics.total_overdue), "Outstanding past the due date"],
    ["Total collected", money(metrics.total_collected), "Non-voided payments in the selected period"],
    ["Cash collected", money(metrics.cash_collected), "Cash payments in the selected period"],
    ["Whish collected", money(metrics.whish_collected), "Whish payments in the selected period"],
    ["Unpromised", money(metrics.total_unpromised), "Outstanding without active promises"],
    ["Broken promises", String(metrics.broken_promises_count), "Past due and still unpaid"],
    ["Promises due soon", String(metrics.upcoming_promises_count), "Today through the next seven days"],
    ["Follow-ups due", String(metrics.due_followups_count), "Customers scheduled for today or earlier"],
  ];
  return <section className="dashboard-page">
    <header className="app-page-heading"><div><p className="app-eyebrow">OVERVIEW</p><h1>Collection overview</h1><p>Your business balances and collection priorities.</p></div><Link to="/customers/new" className="app-primary-button">Add customer</Link></header>
    <Form method="get" className="dashboard-period workspace-panel">
      <label>Collection period<select name="period" value={period} onChange={event => setPeriod(event.target.value)}><option value="today">Today</option><option value="this_week">This week</option><option value="this_month">This month</option><option value="custom">Custom dates</option></select></label>
      {period === "custom" && <><label>From<input name="from" type="date" value={from} onChange={event => setFrom(event.target.value)} required /></label><label>To<input name="to" type="date" min={from} defaultValue={data.period.end} required /></label></>}
      <button className="app-primary-button" disabled={navigation.state !== "idle"}>{navigation.state !== "idle" ? "Loading..." : "Apply"}</button>
      <span>{data.period.start} to {data.period.end} | Asia/Beirut</span>
    </Form>
    <section className="app-stats dashboard-metrics" aria-label="Collection statistics">{cards.map(([label, value, caption]) => <article className="app-stat-card" key={label}><span className="app-stat-top">{label}</span><strong>{value}</strong><small>{caption}</small></article>)}</section>
    <p className="app-data-note">Balances are calculated by the API from non-voided payments. The selected period applies to collections; balances and queues are current.</p>
    <div className="app-panels">
      {([ ["Broken promises", data.queues.broken_promises, "broken"], ["Promises due within seven days", data.queues.upcoming_promises, "pending"] ] as const).map(([title, queue, filter]) => <section className="workspace-panel dashboard-queue" key={title}><div className="app-section-heading"><h2>{title}</h2><Link to={`/promises?status=${filter}`}>View all</Link></div>{queue.length ? queue.map(item => <Link className="dashboard-queue-item" to={`/promises?search=${encodeURIComponent(item.customer_name)}`} key={item.id}><strong>{item.customer_name}</strong><span>{item.promised_on}</span><span>{money(item.remaining_amount)}</span></Link>) : <p className="app-panel-empty">No promises in this queue.</p>}</section>)}
      <section className="workspace-panel dashboard-queue"><div className="app-section-heading"><h2>Follow-ups due</h2><Link to="/follow-ups">View follow-ups</Link></div>{data.queues.due_followups.length ? data.queues.due_followups.map(customer => <Link className="dashboard-queue-item" to={`/customers/${customer.id}`} key={customer.id}><strong>{customer.name}</strong><span>{customer.next_follow_up_on}</span></Link>) : <p className="app-panel-empty">No customer follow-ups due.</p>}</section>
    </div>
  </section>;
}
