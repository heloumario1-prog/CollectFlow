import { redirect, type ActionFunctionArgs } from "react-router";
import { ApiError } from "../../api/client";
import { requireUser } from "../auth/requireUser";
import { promiseService } from "./service";

export async function promisesAction({ request }: ActionFunctionArgs) {
  await requireUser(request);
  const form = await request.formData();
  const id = form.get("id");
  const reason = form.get("cancel_reason");
  if (form.get("intent") !== "cancel" || typeof id !== "string" || !/^[1-9]\d*$/.test(id))
    return { ok: false, message: "Choose a promise to cancel." };
  if (typeof reason !== "string" || reason.trim().length < 3)
    return { ok: false, message: "Enter a cancellation reason of at least 3 characters." };
  try {
    await promiseService.cancel(id, reason, request.signal);
    return { ok: true, message: "Promise cancelled. Its payments and history have been retained." };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw redirect("/login");
    return { ok: false, message: error instanceof ApiError ? Object.values(error.fields).join(" ") || error.message : "Could not cancel the promise. Please try again." };
  }
}
