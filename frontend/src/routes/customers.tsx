import { Link } from "react-router";
import { useEffect, useState } from "react";
import { listCustomers, type ApiCustomer } from "../data/customers";
import { SaveFeedback } from "../components/SaveFeedback";

const money = (value: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listCustomers()
      .then((data) => {
        if (active) setCustomers(data);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Could not load customers.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredCustomers = customers.filter((customer) =>
    `${customer.name} ${customer.phone_e164} ${customer.email ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <section className="content-page">
      <div className="page-header-row">
        <div>
          <p className="eyebrow">CUSTOMERS</p>
          <h1>Customers</h1>
          <p className="page-description">
            Manage your customers and view their outstanding balances.
          </p>
        </div>

        <Link to="/customers/new" className="primary-button">
          + Add customer
        </Link>
      </div>

      <SaveFeedback />

      <div className="content-panel customers-panel">
        <div className="customers-toolbar">
          <div>
            <strong>Customer list</strong>
            <span>{filteredCustomers.length} customers</span>
          </div>

          <input
            className="customer-search"
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="customer-list">
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: "#b42318", fontSize: 12 }}>{error}</p>}

          {!loading &&
            filteredCustomers.map((customer) => (
              <div className="customer-row" key={customer.id}>
                <div className="customer-main">
                  <div className="customer-avatar">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <strong>{customer.name}</strong>
                    <span>{customer.phone_e164}</span>
                  </div>
                </div>

                <div className="customer-balance">
                  <span>Outstanding</span>
                  <strong>{money(customer.total_remaining)}</strong>
                </div>

                <Link
                  to={`/customers/${customer.id}`}
                  className="secondary-button"
                >
                  View
                </Link>
              </div>
            ))}

          {!loading && !error && filteredCustomers.length === 0 && (
            <div className="customer-empty">
              <div className="empty-icon">?</div>
              <strong>No customers found</strong>
              <p>Try searching with a different name, phone number, or email.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}