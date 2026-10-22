export type ReceivableStatus = "Outstanding" | "Partially paid" | "Paid";

export type Receivable = {
  id: number;
  customerId: string;
  customer: string;
  description: string;
  originalAmount: number;
  outstanding: number;
  dueDate: string;
  status: ReceivableStatus;
};

let receivables: Receivable[] = [
  { id: 1, customerId: "hassan-al-khalil", customer: "Hassan Al-Khalil", description: "Cleaning supplies", originalAmount: 2500, outstanding: 1250, dueDate: "2026-10-05", status: "Partially paid" },
  { id: 2, customerId: "samir-youssef", customer: "Samir Youssef", description: "Wholesale products", originalAmount: 1800, outstanding: 980, dueDate: "2026-10-02", status: "Partially paid" },
  { id: 3, customerId: "maria-hani", customer: "Maria Hani", description: "Office supplies", originalAmount: 1000, outstanding: 420, dueDate: "2026-10-12", status: "Partially paid" },
  { id: 4, customerId: "maria-hani", customer: "Maria Hani", description: "Packaging materials", originalAmount: 300, outstanding: 0, dueDate: "2026-10-18", status: "Paid" },
  { id: 5, customerId: "hassan-al-khalil", customer: "Hassan Al-Khalil", description: "Delivery equipment", originalAmount: 450, outstanding: 450, dueDate: "2026-10-20", status: "Outstanding" },
];

export function getReceivables() {
  return receivables.map((receivable) => ({ ...receivable }));
}

export function getReceivable(id: number) {
  const receivable = receivables.find((item) => item.id === id);
  return receivable ? { ...receivable } : undefined;
}

export function addReceivable(receivable: Omit<Receivable, "id">) {
  const id = Math.max(0, ...receivables.map((item) => item.id)) + 1;
  receivables = [...receivables, { ...receivable, id }];
}

export function updateReceivable(id: number, changes: Omit<Receivable, "id">) {
  receivables = receivables.map((item) =>
    item.id === id ? { ...changes, id } : item,
  );
}

export function deleteReceivable(id: number) {
  receivables = receivables.filter((item) => item.id !== id);
}

export function deleteReceivablesForCustomer(customerId: string) {
  receivables = receivables.filter((item) => item.customerId !== customerId);
}