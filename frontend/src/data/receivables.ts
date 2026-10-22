import { apiRequest } from "../api/client";

export type ApiReceivable = {
  id: number;
  customer_detail: {
    id: number;
    name: string;
    phone_e164: string;
    email: string | null;
  };
  original_amount: string;
  currency: string;
  reference: string | null;
  description: string | null;
  issue_date: string;
  due_date: string;
  status: string;
  paid_amount: string;
  remaining_amount: string;
  unpromised_amount: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ReceivableInput = {
  customer: number;
  original_amount: string;
  issue_date: string;
  due_date: string;
  reference: string;
  description: string;
};

export type StatusInfo = { key: string; label: string; className: string };

export function statusInfo(status: string): StatusInfo {
  const key = status.toUpperCase().replace(/[\s-]+/g, "_");
  switch (key) {
    case "PAID":
      return { key: "paid", label: "Paid", className: "paid" };
    case "PARTIALLY_PAID":
      return { key: "partial", label: "Partially paid", className: "partial" };
    case "OVERDUE":
      return { key: "overdue", label: "Overdue", className: "outstanding" };
    case "OPEN":
    case "OUTSTANDING":
      return { key: "outstanding", label: "Outstanding", className: "outstanding" };
    default:
      return { key: "other", label: status, className: "partial" };
  }
}

function body(input: ReceivableInput) {
  const data: Record<string, unknown> = {
    customer: input.customer,
    original_amount: input.original_amount,
    issue_date: input.issue_date,
    due_date: input.due_date,
    description: input.description.trim(),
  };
  if (input.reference.trim()) data.reference = input.reference.trim();
  return data;
}

export async function listReceivables(): Promise<ApiReceivable[]> {
  const all: ApiReceivable[] = [];
  let page = 1;
  while (true) {
    const data = await apiRequest<Page<ApiReceivable> | ApiReceivable[]>(
      `receivables/?page=${page}`,
    );

    if (Array.isArray(data)) return data;

    all.push(...(data.results ?? []));
    if (!data.next) break;
    page += 1;
  }
  return all;
}

export function getReceivableById(id: string) {
  return apiRequest<ApiReceivable>(`receivables/${id}/`);
}

export function createReceivable(input: ReceivableInput) {
  return apiRequest<ApiReceivable>("receivables/", {
    method: "POST",
    body: body(input),
  });
}

export function updateReceivableById(id: string, input: ReceivableInput) {
  return apiRequest<ApiReceivable>(`receivables/${id}/`, {
    method: "PATCH",
    body: body(input),
  });
}

export function archiveReceivableById(id: number | string) {
  return apiRequest<{ detail: string }>(`receivables/${id}/archive/`, {
    method: "POST",
    body: {},
  });
}

// ---------------------------------------------------------------------------
// TEMPORARY fake data. Only here so the payment, promise and follow-up forms
// keep building until we convert them. Delete this part later.
// ---------------------------------------------------------------------------
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