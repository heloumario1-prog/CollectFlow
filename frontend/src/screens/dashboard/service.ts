import { apiRequest } from "../../api/client";
import type { BusinessRead } from "../../type/business";
import type { DashboardSummary } from "../../type/dashboard";

export const dashboardService = {
  summary: (search: string, signal?: AbortSignal) =>
    apiRequest<DashboardSummary>(`dashboard/${search}`, { signal }),
  business: (signal?: AbortSignal) =>
    apiRequest<BusinessRead>("business/", { signal }),
};
