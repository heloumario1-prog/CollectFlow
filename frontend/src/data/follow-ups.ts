
import { apiRequest } from "../api/client";

type ApiFollowUp = {
  id: number;
  customer: number;
  customer_name: string;
  receivable: number | null;
  payment_promise: number | null;
  occurred_at: string;
  note: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

type ApiPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type FollowUp = {
  id: number;
  customerId: number;
  customer: string;
  receivableId: number | null;
  receivable: string;
  date: string;
  notes: string;
  createdBy: string;
};

export type FollowUpInput = {
  customerId: number;
  receivableId: number | null;
  date: string;
  notes: string;
};

function fromApi(item: ApiFollowUp): FollowUp {
  return {
    id: item.id,
    customerId: item.customer,
    customer: item.customer_name,
    receivableId: item.receivable,
    receivable: item.receivable
      ? `Receivable #${item.receivable}`
      : "No related receivable",
    date: item.occurred_at,
    notes: item.note,
    createdBy: item.created_by_name,
  };
}

export async function getFollowUps(): Promise<FollowUp[]> {
  const items: ApiFollowUp[] = [];
  let page = 1;

  while (true) {
    const response = await apiRequest<
      ApiPage<ApiFollowUp> | ApiFollowUp[]
    >(`followups/?page=${page}`);

    if (Array.isArray(response)) {
      items.push(...response);
      break;
    }

    items.push(...response.results);

    if (!response.next) {
      break;
    }

    page += 1;
  }

  return items.map(fromApi);
}

export async function addFollowUp(input: FollowUpInput): Promise<void> {
  await apiRequest<ApiFollowUp>("followups/", {
    method: "POST",
    body: {
      customer: input.customerId,
      receivable: input.receivableId,
      occurred_at: input.date,
      note: input.notes.trim(),
    },
  });
}

export async function updateFollowUp(
  id: number,
  input: FollowUpInput,
): Promise<void> {
  await apiRequest<ApiFollowUp>(`followups/${id}/`, {
    method: "PATCH",
    body: {
      customer: input.customerId,
      receivable: input.receivableId,
      occurred_at: input.date,
      note: input.notes.trim(),
    },
  });
}
