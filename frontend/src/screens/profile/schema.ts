import { z } from "zod";

export const changePasswordSchema = z.object({
  old_password: z.string().min(1, "Enter your current password."),
  new_password: z.string().min(8, "Use at least 8 characters."),
  confirm_password: z.string().min(1, "Confirm your new password."),
}).refine((value) => value.new_password === value.confirm_password, {
  path: ["confirm_password"], message: "Passwords do not match.",
});
