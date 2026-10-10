import type { ActionFunctionArgs } from "react-router";
import type { ChangePasswordWrite } from "../../type/auth";
import { failed, formString, invalid, success } from "../auth/formResult";
import { requireUser } from "../auth/requireUser";
import { authService } from "../auth/service";
import { changePasswordSchema } from "./schema";

export async function profileAction({ request }: ActionFunctionArgs) {
  await requireUser(request);
  const form = await request.formData();
  const parsed = changePasswordSchema.safeParse({
    old_password: formString(form, "old_password"),
    new_password: formString(form, "new_password"),
    confirm_password: formString(form, "confirm_password"),
  });
  if (!parsed.success) return invalid(parsed.error.issues);
  const payload: ChangePasswordWrite = { old_password: parsed.data.old_password, new_password: parsed.data.new_password };
  try {
    await authService.changePassword(payload, request.signal);
    return success("Password changed. Your current session is still active.");
  } catch (error) {
    return failed(error);
  }
}
