import { Link } from "react-router";
import { useState } from "react";
import { getCustomers } from "../data/customers";
import { getReceivables } from "../data/receivables";
import { SaveFeedback } from "../components/SaveFeedback";

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const customers = getCustomers();
  const receivables = getReceivables();

  const filteredCustomers = customers.filter((customer) =>
    `${customer.name} ${customer.country} ${customer.phone}`
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
          {filteredCustomers.map((customer) => {
            const outstanding = receivables
              .filter((receivable) => receivable.customerId === customer.id)
              .reduce((total, receivable) => total + receivable.outstanding, 0);

            return (
            <div className="customer-row" key={customer.id}>
              <div className="customer-main">
                <div className="customer-avatar">
                  {customer.name.charAt(0)}
                </div>

                <div>
                  <strong>{customer.name}</strong>
                  <span>
                    {customer.country} • {customer.phone}
                  </span>
                </div>
              </div>

              <div className="customer-balance">
                <span>Outstanding</span>
                <strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(outstanding)}</strong>
              </div>

              <Link
                to={`/customers/${customer.id}`}
                className="secondary-button"
              >
                View
              </Link>
            </div>
            );
          })}

          {filteredCustomers.length === 0 && (
            <div className="customer-empty">
              <div className="empty-icon">?</div>
              <strong>No customers found</strong>
              <p>
                Try searching with a different name, country, or phone
                number.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}