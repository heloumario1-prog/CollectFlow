import { useEffect, useRef, useState } from "react";
import { Form, Link, Outlet, useLoaderData, useNavigation } from "react-router";
import { AppSidebar } from "./AppSidebar";
import type { dashboardLoader } from "../screens/dashboard/loader";
import "../css/dashboard.css";
import "../css/workspace-pages.css";

export function AppLayout() {
  const { user, business } = useLoaderData<typeof dashboardLoader>();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = useNavigation();
  const signingOut = navigation.state !== "idle" && navigation.formMethod?.toUpperCase() === "POST" && navigation.formAction?.split("?")[0].endsWith("/dashboard");
  const sidebar = useRef<HTMLElement>(null);
  const mainArea = useRef<HTMLDivElement>(null);
  const initials = user.full_name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    if (!menuOpen) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousInert = mainArea.current?.inert ?? false;
    if (mainArea.current) mainArea.current.inert = true;
    sidebar.current?.querySelector<HTMLElement>("button, a")?.focus();
    const media = window.matchMedia("(max-width: 850px)");
    const resized = () => { if (!media.matches) setMenuOpen(false); };
    media.addEventListener("change", resized);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMenuOpen(false); }
      if (event.key === "Tab") {
        const controls = Array.from(sidebar.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? []).filter(element => element.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (first && ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last))) {
          event.preventDefault(); (event.shiftKey ? last : first).focus();
        }
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      media.removeEventListener("change", resized);
      if (mainArea.current) mainArea.current.inert = previousInert;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [menuOpen]);

  return <div className="app-shell">
    <a href="#dashboard-content" className="skip-link">Skip to content</a>
    {menuOpen && <button type="button" className="app-mobile-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside ref={sidebar} className={`app-sidebar ${menuOpen ? "app-sidebar-open" : ""}`} aria-label="Sidebar">
      {menuOpen && <button type="button" className="app-mobile-close" onClick={() => setMenuOpen(false)}>Close menu</button>}
      <AppSidebar role={user.role} onNavigate={() => setMenuOpen(false)} />
    </aside>
    <div ref={mainArea} className="app-main-area">
      <header className="app-topbar">
        <div className="app-topbar-workspace">
          <button className="app-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div><span className="app-topbar-kicker">WORKSPACE</span><strong>{business.name}</strong></div>
        </div>
        <div className="app-profile">
          <span className="app-avatar" aria-hidden="true">{initials || "CF"}</span>
          <div className="app-profile-copy"><strong>{user.full_name}</strong><span>{user.role === "OWNER" ? "Manager" : "Staff"}</span></div>
          <div className="app-profile-actions"><Link to="/settings/profile">Profile</Link><Form method="post" action="/dashboard"><button type="submit" disabled={navigation.state !== "idle"}>{signingOut ? "Signing out…" : "Sign out"}</button></Form></div>
        </div>
      </header>
      {navigation.state === "loading" && <div className="app-navigation-loading" role="status">Loading page…</div>}
      <main id="dashboard-content" tabIndex={-1} className="app-content"><Outlet context={{ user, business }} /></main>
    </div>
  </div>;
}
