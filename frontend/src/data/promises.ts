import { apiRequest } from "../api/client";

export type ApiPromise = {
  id: number;
  receivable: number;
  customer_id: number;
  customer_name: string;
  receivable_archived_at?: string | null;
  customer_archived_at?: string | null;
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
      return { key: "kept", label: "Completed", className: "paid" };
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

export async function listPromises(signal?: AbortSignal): Promise<ApiPromise[]> {
  const all: ApiPromise[] = [];
  let page = 1;
  while (true) {
    const data = await apiRequest<Page<ApiPromise> | ApiPromise[]>(
      `promises/?page=${page}`,
      { signal },
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

export function cancelPromiseById(id: number | string, reason: string, signal?: AbortSignal) {
  return apiRequest<{ detail: string }>(`promises/${id}/cancel/`, {
    method: "POST",
    body: { cancel_reason: reason.trim() },
    signal,
  });
}
