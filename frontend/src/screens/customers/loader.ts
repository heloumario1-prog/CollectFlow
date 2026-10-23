import { redirect, type LoaderFunctionArgs } from "react-router";
import { ApiError } from "../../api/client";
import { customerService } from "./service";

export async function customersLoader({ request }: LoaderFunctionArgs) {
  const value = new URL(request.url).searchParams.get("status");
  const status = value === "archived" || value === "all" ? value : "active";
  try {
    return { customers: await customerService.list(status, request.signal), status };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403))
      throw redirect("/login");
    throw error;
  }
}
