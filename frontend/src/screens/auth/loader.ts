import type { LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../api/client";
import { authService } from "./service";

export async function homeAuthLoader({ request }: LoaderFunctionArgs) {
  try {
    return await authService.currentUser(request.signal);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403 || error.status === 0)
    )
      return null;
    throw error;
  }
}
