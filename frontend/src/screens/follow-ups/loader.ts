import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "../auth/requireUser";
import { followUpService } from "./service";

export async function followUpsLoader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  return { followUps: await followUpService.list(request.signal) };
}
