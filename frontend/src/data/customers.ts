export type Customer = {
  id: string;
  name: string;
  country: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

let customers: Customer[] = [
  {
    id: "hassan-al-khalil",
    name: "Hassan Al-Khalil",
    country: "Lebanon",
    phone: "+961 70 123 456",
    email: "hassan@example.com",
    address: "Beirut, Lebanon",
    notes: "Preferred contact time: evenings.",
  },
  {
    id: "samir-youssef",
    name: "Samir Youssef",
    country: "Saudi Arabia",
    phone: "+966 50 987 654",
    email: "samir@example.com",
    address: "Riyadh, Saudi Arabia",
    notes: "",
  },
  {
    id: "maria-hani",
    name: "Maria Hani",
    country: "Jordan",
    phone: "+962 7 776 8891",
    email: "maria@example.com",
    address: "Amman, Jordan",
    notes: "",
  },
];

export let customerOptions = customers.map(({ id, name }) => ({ id, name }));

function refreshCustomerOptions() {
  customerOptions = customers.map(({ id, name }) => ({ id, name }));
}

function createCustomerId(name: string) {
  const baseId = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "customer";
  let id = baseId;
  let suffix = 2;
  while (customers.some((customer) => customer.id === id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  return id;
}

export function getCustomers() {
  return customers.map((customer) => ({ ...customer }));
}

export function getCustomer(id: string) {
  const customer = customers.find((item) => item.id === id);
  return customer ? { ...customer } : undefined;
}

export function addCustomer(customer: Omit<Customer, "id">) {
  const created = { ...customer, id: createCustomerId(customer.name) };
  customers = [...customers, created];
  refreshCustomerOptions();
  return created;
}

export function updateCustomer(id: string, changes: Omit<Customer, "id">) {
  customers = customers.map((customer) =>
    customer.id === id ? { ...changes, id } : customer,
  );
  refreshCustomerOptions();
}

export function deleteCustomer(id: string) {
  customers = customers.filter((customer) => customer.id !== id);
  refreshCustomerOptions();
}
