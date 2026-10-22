import { apiRequest } from "../../api/client";
import type { StaffCreateWrite, StaffRead, StaffResetPasswordWrite, StaffUpdateWrite } from "../../type/staff";

const path = (id: number) => `staff/${id}/`;

export const staffService = {
  list: (signal?: AbortSignal) => apiRequest<StaffRead[]>("staff/", { signal }),
  detail: (id: number, signal?: AbortSignal) => apiRequest<StaffRead>(path(id), { signal }),
  create: (payload: StaffCreateWrite, signal?: AbortSignal) => apiRequest<StaffRead>("staff/", { method: "POST", body: payload, signal }),
  update: (id: number, payload: StaffUpdateWrite, signal?: AbortSignal) => apiRequest<StaffRead>(path(id), { method: "PATCH", body: payload, signal }),
  deactivate: (id: number, signal?: AbortSignal) => apiRequest<StaffRead>(`${path(id)}deactivate/`, { method: "POST", signal }),
  reactivate: (id: number, signal?: AbortSignal) => apiRequest<StaffRead>(`${path(id)}reactivate/`, { method: "POST", signal }),
  resetPassword: (id: number, payload: StaffResetPasswordWrite, signal?: AbortSignal) => apiRequest<{ message: string }>(`${path(id)}reset-password/`, { method: "POST", body: payload, signal }),
};
