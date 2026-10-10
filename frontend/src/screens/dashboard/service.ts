import { apiRequest } from "../../api/client";
import type { BusinessRead } from "../../type/business";

export const dashboardService = {
  business: (signal?: AbortSignal) =>
    apiRequest<BusinessRead>("business/", { signal }),
};
