import { apiRequest } from "../../api/client";
import type { BusinessRead, BusinessWrite } from "../../type/business";

export const businessService = {
  read: (signal?: AbortSignal) => apiRequest<BusinessRead>("business/", { signal }),
  update: (payload: BusinessWrite, signal?: AbortSignal) => apiRequest<BusinessRead>("business/", { method: "PATCH", body: payload, signal }),
};
