import { NavLink } from "react-router";

export const mainNavigation = [
  { label: "Dashboard", to: "/" },
  { label: "Customers", to: "/customers" },
  { label: "Receivables", to: "/receivables" },
  { label: "Promises", to: "/promises" },
  { label: "Payments", to: "/payments" },
  { label: "Follow-ups", to: "/follow-ups" },
];

export const settingsNavigation = { label: "Settings", to: "/settings" };
export const allNavigation = [...mainNavigation, settingsNavigation];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">C</div>

        <div>
          <strong>CollectFlow</strong>
          <span>Receivables management</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-title">MAIN MENU</p>

        {mainNavigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to={settingsNavigation.to} className="nav-link">
          {settingsNavigation.label}
        </NavLink>
      </div>
    </aside>
  );
}