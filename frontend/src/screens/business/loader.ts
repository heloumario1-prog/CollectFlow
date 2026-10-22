import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "../auth/requireUser";
import { businessService } from "./service";

export async function businessLoader({ request }: LoaderFunctionArgs) {
  await requireUser(request, true);
  return businessService.read(request.signal);
}
