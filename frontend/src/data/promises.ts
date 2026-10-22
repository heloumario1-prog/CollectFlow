import { apiRequest } from "../api/client";

export type ApiPromise = {
  id: number;
  receivable: number;
  customer_id: number;
  customer_name: string;
  amount: string;
  promised_on: string;
  note: string | null;
  status: string;
  paid_amount: string;
  remaining_amount: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
};

type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type PromiseInput = {
  receivable: number;
  amount: string;
  promised_on: string;
  note: string;
};

export type PromiseStatusInfo = {
  key: string;
  label: string;
  className: string;
};

export function promiseStatusInfo(status: string): PromiseStatusInfo {
  switch (status.toUpperCase()) {
    case "PENDING":
      return { key: "pending", label: "Pending", className: "upcoming" };
    case "BROKEN":
      return { key: "broken", label: "Broken", className: "overdue" };
    case "KEPT":
      return { key: "kept", label: "Kept", className: "upcoming" };
    case "CANCELLED":
      return { key: "cancelled", label: "Cancelled", className: "upcoming" };
    default:
      return { key: "other", label: status, className: "upcoming" };
  }
}

function body(input: PromiseInput) {
  return {
    receivable: input.receivable,
    amount: input.amount,
    promised_on: input.promised_on,
    note: input.note.trim() || null,
  };
}

export async function listPromises(): Promise<ApiPromise[]> {
  const all: ApiPromise[] = [];
  let page = 1;
  while (true) {
    const data = await apiRequest<Page<ApiPromise> | ApiPromise[]>(
      `promises/?page=${page}`,
    );

    if (Array.isArray(data)) return data;

    all.push(...(data.results ?? []));
    if (!data.next) break;
    page += 1;
  }
  return all;
}

export function getPromiseById(id: string) {
  return apiRequest<ApiPromise>(`promises/${id}/`);
}

export function createPromise(input: PromiseInput) {
  return apiRequest<ApiPromise>("promises/", {
    method: "POST",
    body: body(input),
  });
}

export function updatePromiseById(id: string, input: PromiseInput) {
  return apiRequest<ApiPromise>(`promises/${id}/`, {
    method: "PATCH",
    body: body(input),
  });
}

export function cancelPromiseById(id: number | string, reason: string) {
  return apiRequest<{ detail: string }>(`promises/${id}/cancel/`, {
    method: "POST",
    body: { cancel_reason: reason.trim() },
  });
}

// ---------------------------------------------------------------------------
// TEMPORARY fake data. Only here so anything that still imports it keeps
// building. Delete this part later.
// ---------------------------------------------------------------------------
export type PromiseStatus = "Upcoming" | "Overdue";

export type PaymentPromise = {
  id: number;
  customer: string;
  customerId: string;
  amount: number;
  promiseDate: string;
  status: PromiseStatus;
};

let promises: PaymentPromise[] = [
  { id: 1, customer: "Hassan Al-Khalil", customerId: "hassan-al-khalil", amount: 600, promiseDate: "2026-10-03", status: "Upcoming" },
  { id: 2, customer: "Samir Youssef", customerId: "samir-youssef", amount: 500, promiseDate: "2026-10-07", status: "Upcoming" },
  { id: 3, customer: "Maria Hani", customerId: "maria-hani", amount: 420, promiseDate: "2026-09-25", status: "Overdue" },
];

export function getPromises() {
  return promises.map((promise) => ({ ...promise }));
}

export function getPromise(id: number) {
  const promise = promises.find((item) => item.id === id);
  return promise ? { ...promise } : undefined;
}

export function addPromise(promise: Omit<PaymentPromise, "id">) {
  const id = Math.max(0, ...promises.map((item) => item.id)) + 1;
  promises = [...promises, { ...promise, id }];
}

export function updatePromise(id: number, changes: Omit<PaymentPromise, "id">) {
  promises = promises.map((item) =>
    item.id === id ? { ...changes, id } : item,
  );
}

export function deletePromise(id: number) {
  promises = promises.filter((item) => item.id !== id);
}