import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

export type ApiCustomer = {
  id: number;
  name: string;
  phone_e164: string;
  email: string | null;
  notes: string | null;
  next_follow_up_on: string | null;
  total_receivables: number;
  total_paid: string;
  total_remaining: string;
  has_outstanding: boolean;
  whatsapp_url: string;
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

export type CustomerInput = {
  name: string;
  country: string;
  phone: string;
  email: string;
  notes: string;
  next_follow_up_on: string;
};

function baseBody(input: CustomerInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim() || null,
    notes: input.notes.trim() || null,
    next_follow_up_on: input.next_follow_up_on || null,
  };
}

export async function listCustomers(
  status: "active" | "archived" | "all" = "active",
  signal?: AbortSignal,
): Promise<ApiCustomer[]> {
  const all: ApiCustomer[] = [];
  let page = 1;
  while (true) {
    const data = await apiRequest<Page<ApiCustomer> | ApiCustomer[]>(
      `customers/?page=${page}&is_archived=${status === "archived" ? "true" : status === "all" ? "all" : "false"}`,
      { signal },
    );

    if (Array.isArray(data)) return data;

    all.push(...(data.results ?? []));
    if (!data.next) break;
    page += 1;
  }
  return all;
}

export function getCustomerById(id: string) {
  return apiRequest<ApiCustomer>(`customers/${id}/?is_archived=all`);
}

export function createCustomer(input: CustomerInput) {
  return apiRequest<ApiCustomer>("customers/", {
    method: "POST",
    body: {
      ...baseBody(input),
      phone_country: input.country,
      phone_national_number: input.phone.trim(),
    },
  });
}

export function updateCustomerById(
  id: string,
  input: CustomerInput,
  phoneChanged: boolean,
) {
  const body: Record<string, unknown> = { ...baseBody(input) };
  if (phoneChanged) {
    body.phone_country = input.country;
    body.phone_national_number = input.phone.trim();
  }
  return apiRequest<ApiCustomer>(`customers/${id}/`, {
    method: "PATCH",
    body,
  });
}

export function archiveCustomerById(id: string) {
  return apiRequest<{ detail: string }>(`customers/${id}/archive/`, {
    method: "POST",
    body: {},
  });
}

export type CustomerOption = { id: number; name: string };

export function useCustomerOptions() {
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listCustomers()
      .then((data) => {
        if (active) setOptions(data.map(({ id, name }) => ({ id, name })));
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Could not load customers.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { options, loading, error };
}

// TEMPORARY: keeps the 4 forms building until we switch them to useCustomerOptions.
// The dropdowns in those forms will be empty until then.
export const customerOptions: { id: string; name: string }[] = [];
