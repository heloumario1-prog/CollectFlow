import { redirect, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../api/client";
import { authService } from "../auth/service";
import { dashboardService } from "./service";

export function dashboardSummaryLoader({ request }: LoaderFunctionArgs) {
  return dashboardService.summary(new URL(request.url).search, request.signal);
}

export async function dashboardLoader({ request }: LoaderFunctionArgs) {
  let user;
  try {
    user = await authService.currentUser(request.signal);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      const next = new URL(request.url).pathname;
      throw redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    throw error;
  }
  try {
    const business = await dashboardService.business(request.signal);
    return { user, business };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw redirect("/login");
    throw error;
  }
}
