import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "../auth/requireUser";
import { receivableService } from "./service";

export async function receivablesLoader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  const raw = new URL(request.url).searchParams.get("archive");
  const archive = raw === "archived" || raw === "all" ? raw : "active";
  return { receivables: await receivableService.list(archive, request.signal), archive };
}
