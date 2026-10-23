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
  issue_date: string | null;
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
      return { key: "outstanding", label: "Open", className: "outstanding" };
    default:
      return { key: "other", label: status, className: "partial" };
  }
}

function body(input: ReceivableInput) {
  const data: Record<string, unknown> = {
    customer: input.customer,
    original_amount: input.original_amount,
    issue_date: input.issue_date || null,
    due_date: input.due_date,
    description: input.description.trim(),
  };
  data.reference = input.reference.trim() || null;
  return data;
}

export async function listReceivables(
  archive: "active" | "archived" | "all" = "active",
  signal?: AbortSignal,
): Promise<ApiReceivable[]> {
  const all: ApiReceivable[] = [];
  let page = 1;
  while (true) {
    const data = await apiRequest<Page<ApiReceivable> | ApiReceivable[]>(
      `receivables/?page=${page}&is_archived=${archive === "archived" ? "true" : archive === "all" ? "all" : "false"}`,
      { signal },
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
