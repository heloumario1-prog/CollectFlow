import { z } from "zod";

export const businessSchema = z.object({
  name: z.string().trim().min(1, "Enter a business name.").max(150, "Use 150 characters or fewer."),
  phone_e164: z.string().trim().min(1, "Enter a business phone number.").refine((value) => /^[+\d\s().-]+$/.test(value) && /^\+?\d/.test(value) && value.replace(/\D/g, "").length >= 7 && value.replace(/\D/g, "").length <= 15, "Enter a valid phone number."),
});
