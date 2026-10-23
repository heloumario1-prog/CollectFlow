import { redirect, type ActionFunctionArgs } from "react-router";
import { ApiError } from "../../api/client";
import { requireUser } from "../auth/requireUser";
import { followUpService } from "./service";

export async function followUpsAction({ request }: ActionFunctionArgs) {
  await requireUser(request);
  const form = await request.formData();
  const id = form.get("id");
  const intent = form.get("intent");
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id) || (intent !== "delete" && intent !== "complete"))
    return { ok: false, message: "Choose a follow-up and a valid action." };
  try {
    if (intent === "delete") await followUpService.remove(id, request.signal);
    else await followUpService.complete(id, request.signal);
    return { ok: true, intent, message: intent === "delete" ? "Follow-up deleted from the list. Its history is retained." : "Follow-up marked completed." };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw redirect("/login");
    return { ok: false, message: error instanceof ApiError ? error.message : "Could not update the follow-up. Please try again." };
  }
}
