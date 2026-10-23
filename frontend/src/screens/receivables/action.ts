import { redirect, type ActionFunctionArgs } from "react-router";
import { ApiError } from "../../api/client";
import { requireUser } from "../auth/requireUser";
import { receivableService } from "./service";

export async function receivablesAction({ request }: ActionFunctionArgs) {
  await requireUser(request);
  const form = await request.formData();
  const id = form.get("id");
  const intent = form.get("intent");
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id) || (intent !== "archive" && intent !== "restore"))
    return { error: "Choose a receivable and a valid action." };
  try {
    if (intent === "restore") await receivableService.restore(id, request.signal);
    else await receivableService.archive(id);
    return { message: intent === "restore" ? "Receivable restored to the active list." : "Receivable archived. Find it under Show: Archived receivables." };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw redirect("/login");
    return { error: error instanceof ApiError ? error.message : "Could not update the receivable. Please try again." };
  }
}
