import type { ActionFunctionArgs } from "react-router";
import type { BusinessWrite } from "../../type/business";
import { failed, formString, invalid, success } from "../auth/formResult";
import { requireUser } from "../auth/requireUser";
import { businessSchema } from "./schema";
import { businessService } from "./service";

export async function businessAction({ request }: ActionFunctionArgs) {
  await requireUser(request, true);
  const form = await request.formData();
  const parsed = businessSchema.safeParse({ name: formString(form, "name"), phone_e164: formString(form, "phone_e164") });
  if (!parsed.success) return invalid(parsed.error.issues);
  const payload: BusinessWrite = parsed.data;
  try {
    await businessService.update(payload, request.signal);
    return success("Business information saved.");
  } catch (error) {
    return failed(error);
  }
}
