import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "../auth/requireUser";
import { staffService } from "./service";

export async function staffLoader({ request }: LoaderFunctionArgs) {
  await requireUser(request, true);
  return { staff: await staffService.list(request.signal) };
}

export async function staffDetailLoader({ request, params }: LoaderFunctionArgs) {
  await requireUser(request, true);
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Response("Not found", { status: 404 });
  return staffService.detail(id, request.signal);
}
