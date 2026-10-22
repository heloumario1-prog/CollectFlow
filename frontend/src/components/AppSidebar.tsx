import type { ReactNode } from "react";
import { NavLink } from "react-router";
import type { UserRead } from "../type/auth";

type IconName = "grid" | "users" | "file" | "promise" | "wallet" | "clock" | "team" | "settings" | "business";

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5" /></>,
    file: <><path d="M5 3h9l5 5v13H5zM14 3v5h5M8 13h8M8 17h8" /></>,
    promise: <><path d="M12 21s-8-4.5-8-10V4l8-2 8 2v7c0 5.5-8 10-8 10Z" /><path d="m9 11 2 2 4-4" /></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2" /><path d="M3 9V5a2 2 0 0 1 2-2h13M16 14h5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    team: <><circle cx="8" cy="9" r="3" /><circle cx="17" cy="9" r="3" /><path d="M2 20a6 6 0 0 1 12 0m-1 0a5 5 0 0 1 9 0" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M10 2h4l.6 2.2 2 .9 2-.9 2.8 2.8-.9 2 .9 2L23 12v4l-2.2.6-.9 2 .9 2-2.8 2.8-2-.9-2 .9L14 23h-4l-.6-2.2-2-.9-2 .9-2.8-2.8.9-2-.9-2L1 14v-4l2.2-.6.9-2-.9-2L6 2.6l2 .9 2-.9Z" transform="translate(0 -2) scale(.93)" /></>,
    business: <><path d="M4 21V5h16v16M2 21h20M8 9h2m4 0h2m-8 4h2m4 0h2m-6 8v-4h4v4" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const mainItems: { label: string; to: string; icon: IconName }[] = [
  { label: "Dashboard", to: "/dashboard", icon: "grid" },
  { label: "Customers", to: "/customers", icon: "users" },
  { label: "Receivables", to: "/receivables", icon: "file" },
  { label: "Promises", to: "/promises", icon: "promise" },
  { label: "Payments", to: "/payments", icon: "wallet" },
  { label: "Follow-ups", to: "/follow-ups", icon: "clock" },
];

export function AppSidebar({ role, onNavigate }: { role: UserRead["role"]; onNavigate?: () => void }) {
  const navLink = ({ label, to, icon }: { label: string; to: string; icon: IconName }) => (
    <NavLink key={to} to={to} end={to === "/dashboard"} onClick={onNavigate} className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link-active" : ""}`}>
      <NavIcon name={icon} /><span>{label}</span>
    </NavLink>
  );

  return <div className="app-sidebar-inner">
    <NavLink to="/dashboard" onClick={onNavigate} className="app-brand" aria-label="CollectFlow dashboard">
      <span className="app-brand-mark" aria-hidden="true"><span>C</span></span>
      <span className="app-brand-type"><strong>Collect<span>Flow</span></strong><small>RECEIVABLES WORKSPACE</small></span>
    </NavLink>
    <nav aria-label="Workspace navigation" className="app-sidebar-nav">
      <p className="app-nav-heading">WORKSPACE</p>
      {mainItems.map(navLink)}
      {role === "OWNER" && <><p className="app-nav-heading app-nav-heading-spaced">MANAGEMENT</p>{navLink({ label: "Team", to: "/staff", icon: "team" })}</>}
    </nav>
    <nav aria-label="Settings navigation" className="app-sidebar-bottom">
      <p className="app-nav-heading">ACCOUNT</p>
      {navLink({ label: "My profile", to: "/settings/profile", icon: "settings" })}
      {role === "OWNER" && navLink({ label: "Business settings", to: "/settings/business", icon: "business" })}
    </nav>
  </div>;
}
