import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { allNavigation, Sidebar } from "../components/Sidebar";

export function RootLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="topbar-brand">
            <span className="topbar-label">WORKSPACE</span>
            <strong>CollectFlow</strong>
          </div>

          <div className="user-area">
            <div className="user-avatar">M</div>

            <div>
              <strong>Mario</strong>
              <span>Owner</span>
            </div>

            <NavLink to="/settings" className="profile-link">
              Settings
            </NavLink>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {mobileMenuOpen && (
        <div
          className="mobile-navigation-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <aside
            id="mobile-navigation"
            className="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="CollectFlow navigation"
          >
            <div className="mobile-navigation-header">
              <div className="sidebar-brand">
                <div className="brand-icon">C</div>
                <div>
                  <strong>CollectFlow</strong>
                  <span>Receivables management</span>
                </div>
              </div>
              <button
                type="button"
                className="mobile-navigation-close"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                ×
              </button>
            </div>

            <nav className="sidebar-nav" aria-label="Main navigation">
              <p className="nav-title">MAIN MENU</p>
              {allNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}