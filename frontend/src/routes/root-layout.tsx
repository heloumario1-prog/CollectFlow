import { NavLink, Outlet } from "react-router";

export function RootLayout() {
  return (
    <div className="app-shell">
      <header>
        <NavLink to="/" className="brand">
          CollectFlow
        </NavLink>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
