import { z } from "zod";

const full_name = z.string().trim().min(1, "Enter a full name.").max(150, "Use 150 characters or fewer.");
const email = z.string().trim().pipe(z.email("Enter a valid email address.")).transform((value) => value.trim().toLowerCase());
const password = z.string().min(8, "Use at least 8 characters.");

export const staffCreateSchema = z.object({ full_name, email, password });
export const staffUpdateSchema = z.object({ full_name, email });
export const staffResetSchema = z.object({ new_password: password, confirm_password: z.string().min(1, "Confirm the password.") })
  .refine((value) => value.new_password === value.confirm_password, { path: ["confirm_password"], message: "Passwords do not match." });
