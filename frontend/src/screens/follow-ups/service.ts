import { apiRequest } from "../../api/client";
import { getFollowUps } from "../../data/follow-ups";

export const followUpService = {
  list: getFollowUps,
  remove: (id: string, signal?: AbortSignal) =>
    apiRequest<void>(`followups/${id}/archive/`, { method: "POST", body: {}, signal }),
  complete: (id: string, signal?: AbortSignal) =>
    apiRequest(`followups/${id}/complete/`, { method: "POST", body: {}, signal }),
};
