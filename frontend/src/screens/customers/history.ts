import { apiRequest } from "../../api/client";
import type { ApiReceivable } from "../../data/receivables";
import type { ApiPromise } from "../../data/promises";

type PaymentHistory = { id: number; amount: string; paid_on: string; method: string; is_voided: boolean; void_reason: string | null };
type FollowUpHistory = { id: number; occurred_at: string; note: string; completed_at: string | null };

async function pages<T>(path: string, signal: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const data = await apiRequest<T[] | { results: T[]; next: string | null }>(`${path}&page=${page}`, { signal });
    if (Array.isArray(data)) return data;
    items.push(...data.results);
    if (!data.next) return items;
  }
}

export async function customerHistory(id: string, signal: AbortSignal) {
  const [receivables, promises, payments, followUps] = await Promise.all([
    pages<ApiReceivable>(`receivables/?customer=${encodeURIComponent(id)}&is_archived=all`, signal),
    pages<ApiPromise>(`promises/?customer=${encodeURIComponent(id)}`, signal),
    pages<PaymentHistory>(`payments/?customer=${encodeURIComponent(id)}`, signal),
    pages<FollowUpHistory>(`followups/?customer=${encodeURIComponent(id)}`, signal),
  ]);
  return { receivables, promises, payments, followUps };
}
