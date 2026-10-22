import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "../auth/requireUser";
import { businessService } from "../business/service";

export async function profileLoader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  return { user, business: await businessService.read(request.signal) };
}
