import { redirect } from "react-router";
import { ApiError } from "../../api/client";
import type { UserRead } from "../../type/auth";
import { authService } from "./service";

export async function requireUser(request: Request, ownerOnly = false): Promise<UserRead> {
  let user: UserRead;
  try {
    user = await authService.currentUser(request.signal);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      const next = new URL(request.url).pathname;
      throw redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    throw error;
  }
  if (ownerOnly && user.role !== "OWNER") {
    throw new Response("Manager access required.", { status: 403 });
  }
  return user;
}
