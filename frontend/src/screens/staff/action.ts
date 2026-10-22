import { data, type ActionFunctionArgs } from "react-router";
import type { StaffCreateWrite, StaffResetPasswordWrite, StaffUpdateWrite } from "../../type/staff";
import { failed, formString, invalid, success, type FormResult } from "../auth/formResult";
import { requireUser } from "../auth/requireUser";
import { staffService } from "./service";
import { staffCreateSchema, staffResetSchema, staffUpdateSchema } from "./schema";

export async function staffAction({ request }: ActionFunctionArgs) {
  await requireUser(request, true);
  const form = await request.formData();
  const intent = formString(form, "intent");
  const rawId = formString(form, "id");
  const id = Number(rawId);
  if (intent !== "create" && (!Number.isSafeInteger(id) || id <= 0)) {
    return data<FormResult>({ ok: false, message: "Choose a valid staff member.", fieldErrors: {}, intent }, { status: 400 });
  }
  try {
    if (intent === "create") {
      const parsed = staffCreateSchema.safeParse({ full_name: formString(form, "full_name"), email: formString(form, "email"), password: formString(form, "password") });
      if (!parsed.success) return invalid(parsed.error.issues, intent);
      const payload: StaffCreateWrite = parsed.data;
      await staffService.create(payload, request.signal);
      return success("Staff member added. Share the initial password through a secure channel.", intent);
    }
    if (intent === "edit") {
      const parsed = staffUpdateSchema.safeParse({ full_name: formString(form, "full_name"), email: formString(form, "email") });
      if (!parsed.success) return invalid(parsed.error.issues, intent);
      const payload: StaffUpdateWrite = parsed.data;
      await staffService.update(id, payload, request.signal);
      return success("Staff details saved.", intent);
    }
    if (intent === "reset") {
      const parsed = staffResetSchema.safeParse({ new_password: formString(form, "new_password"), confirm_password: formString(form, "confirm_password") });
      if (!parsed.success) return invalid(parsed.error.issues, intent);
      const payload: StaffResetPasswordWrite = { new_password: parsed.data.new_password };
      await staffService.resetPassword(id, payload, request.signal);
      return success("Password reset. Share the new password through a secure channel.", intent);
    }
    if (intent === "deactivate") {
      await staffService.deactivate(id, request.signal);
      return success("Staff member deactivated.", intent);
    }
    if (intent === "reactivate") {
      await staffService.reactivate(id, request.signal);
      return success("Staff member reactivated.", intent);
    }
    return data<FormResult>({ ok: false, message: "Choose an action and try again.", fieldErrors: {}, intent }, { status: 400 });
  } catch (error) {
    return failed(error, intent);
  }
}
