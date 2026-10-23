import { apiRequest } from "../../api/client";
import { archiveReceivableById, listReceivables } from "../../data/receivables";

export const receivableService = {
  list: listReceivables,
  archive: archiveReceivableById,
  restore: (id: string, signal?: AbortSignal) =>
    apiRequest<{ detail: string }>(`receivables/${id}/restore/?is_archived=true`, {
      method: "POST", body: {}, signal,
    }),
};
