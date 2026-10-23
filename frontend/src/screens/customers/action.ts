import { redirect, type ActionFunctionArgs } from "react-router";
import { ApiError } from "../../api/client";
import { customerService } from "./service";

export async function customersAction({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const id = form.get("id");
  if (form.get("intent") !== "restore" || typeof id !== "string" || !/^\d+$/.test(id))
    return { error: "Choose a customer to restore." };
  try {
    await customerService.restore(id, request.signal);
    return { message: "Customer restored. You can find them in Active customers." };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw redirect("/login");
    return { error: error instanceof ApiError ? error.message : "Could not restore the customer. Please try again." };
  }
}
