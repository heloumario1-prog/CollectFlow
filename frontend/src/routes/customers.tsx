import { StatusBadge } from "../components/StatusBadge";
import { Link, useFetcher, useLoaderData, useSearchParams } from "react-router";
import { useState } from "react";
import type { customersLoader } from "../screens/customers/loader";
import type { customersAction } from "../screens/customers/action";
import { SaveFeedback } from "../components/SaveFeedback";

const money = (value: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const { customers, status } = useLoaderData<typeof customersLoader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const restore = useFetcher<typeof customersAction>();
  const restoring = restore.state !== "idle";

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
      {restore.data && "error" in restore.data && (
        <p role="alert">{restore.data.error}</p>
      )}
      {restore.data && "message" in restore.data && (
        <p className="save-feedback" role="status">{restore.data.message}</p>
      )}

      <div className="content-panel customers-panel">
        <div className="customers-toolbar">
          <div>
            <strong>Customer list</strong>
            <span>{filteredCustomers.length} customers</span>
          </div>

          <label className="customer-status-filter">
            Show
            <select
              className="customer-search"
              value={status}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                next.set("status", event.target.value);
                setSearchParams(next);
              }}
            >
              <option value="active">Active customers</option>
              <option value="archived">Archived customers</option>
              <option value="all">All customers</option>
            </select>
          </label>
          <input
            aria-label="Search customers"
            className="customer-search"
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="customer-list">
          {filteredCustomers.map((customer) => (
            <div className="customer-row" key={customer.id}>
              <div className="customer-main">
                <div className="customer-avatar">
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <strong>{customer.name}</strong>
                  <span>{customer.phone_e164}</span>
                  <StatusBadge status={customer.archived_at ? "Archived" : "Active"} />
                </div>
              </div>

              <div className="customer-balance">
                <span>Outstanding</span>
                <strong>{money(customer.total_remaining)}</strong>
              </div>

              {customer.archived_at ? (
                <restore.Form method="post" action={`/customers?${searchParams.toString()}`}>
                  <input type="hidden" name="intent" value="restore" />
                  <input type="hidden" name="id" value={customer.id} />
                  <button type="submit" className="secondary-button" disabled={restoring}
                    aria-label={`Restore ${customer.name}`}>
                    {restoring && restore.formData?.get("id") === String(customer.id)
                      ? "Restoring..." : "Restore"}
                  </button>
                </restore.Form>
              ) : (
                <Link to={`/customers/${customer.id}`} className="secondary-button">
                  View
                </Link>
              )}
            </div>
          ))}

          {filteredCustomers.length === 0 && (
            <div className="customer-empty">
              <div className="empty-icon">?</div>
              <strong>{status === "archived" ? "No archived customers found" : "No customers found"}</strong>
              <p>{search ? "Try searching with a different name, phone number, or email." : status === "archived" ? "Archived customers will appear here. Restore one to return them to the active list." : "Add a customer or choose another filter."}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}