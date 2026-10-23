import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "../auth/requireUser";
import { promiseService } from "./service";

export async function promisesLoader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  return { promises: await promiseService.list(request.signal) };
}
