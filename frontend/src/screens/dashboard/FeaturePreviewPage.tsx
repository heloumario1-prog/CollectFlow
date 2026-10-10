import { Link, useLocation, useOutletContext } from "react-router";
import type { UserRead } from "../../type/auth";

const pages: Record<string, { title: string; description: string }> = {
  "/customers": { title: "Customers", description: "Customer records and contact history will appear here." },
  "/customers/new": { title: "Add customer", description: "The customer creation form will appear here once its API is connected." },
  "/receivables": { title: "Receivables", description: "Your receivables and balances will appear here." },
  "/promises": { title: "Promises", description: "Payment promises and due dates will appear here." },
  "/payments": { title: "Payments", description: "Cash and Whish payment history will appear here." },
  "/follow-ups": { title: "Follow-ups", description: "Follow-up activity and scheduled contacts will appear here." },
  "/staff": { title: "Team", description: "Staff management will appear here." },
  "/settings/profile": { title: "My profile", description: "Profile information and password settings will appear here." },
  "/settings/business": { title: "Business settings", description: "Business details and settings will appear here." },
};

export function FeaturePreviewPage() {
  const { pathname } = useLocation();
  const { user } = useOutletContext<{ user: UserRead }>();
  if ((pathname === "/staff" || pathname === "/settings/business") && user.role !== "OWNER") return <section className="app-placeholder"><p className="app-eyebrow">RESTRICTED</p><h1>Manager access required</h1><p>Your manager can open this area.</p><Link to="/dashboard">Back to dashboard</Link></section>;
  const page = pages[pathname];
  if (!page) return <section className="app-placeholder"><p className="app-eyebrow">NOT FOUND</p><h1>Page unavailable</h1><Link to="/dashboard">Back to dashboard</Link></section>;
  return <section className="app-placeholder"><p className="app-eyebrow">{page.title.toUpperCase()}</p><h1>{page.title}</h1><p>{page.description}</p><div className="app-placeholder-card"><span>COMING SOON</span><strong>This area is being prepared.</strong><p>Your account and workspace are connected. Collection features will appear here as their APIs become available.</p><Link to="/dashboard">← Back to dashboard</Link></div></section>;
}
