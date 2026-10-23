import { apiRequest } from "../../api/client";
import { listCustomers } from "../../data/customers";

export const customerService = {
  list: listCustomers,
  restore: (id: string, signal?: AbortSignal) =>
    apiRequest<{ detail: string }>(`customers/${encodeURIComponent(id)}/restore/?is_archived=true`, {
      method: "POST",
      body: {},
      signal,
    }),
};
