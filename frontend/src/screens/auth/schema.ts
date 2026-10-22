import { z } from "zod";
//specifies email validation and transformation to lowercase
const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .pipe(z.email("Enter a valid email address."))
  .transform((value) => value.toLowerCase());
// login schema for validating email and password fields
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

// register schema for validating user registration fields
export const registerSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(1, "Enter your business name.")
      .max(150, "Use 150 characters or fewer."),
    businessPhone: z
      .string()
      .trim()
      .min(1, "Enter your business phone number.")
      .refine(
        (value) =>
          /^[+\d\s().-]+$/.test(value) &&
          /^\+?\d/.test(value) &&
          value.replace(/\D/g, "").length >= 7 &&
          value.replace(/\D/g, "").length <= 15,
        "Enter a valid phone number."
      ),
    firstName: z.string().trim().min(1, "Enter your first name."),
    lastName: z.string().trim().min(1, "Enter your last name."),
    email,
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  // object validation between all fields
  .superRefine((values, context) => {
    // checks if password and confirmPassword fields match
    if (values.password !== values.confirmPassword) {
      // adds a custom issue to the context for the confirmPassword field if they do not match
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
    // checks if the combined length of firstName and lastName exceeds 150 characters
    if (`${values.firstName} ${values.lastName}`.length > 150) {
      // adds a custom issue to the context for the lastName field if the combined length exceeds 150 characters
      context.addIssue({
        code: "custom",
        path: ["lastName"],
        message: "Use 150 characters or fewer for your full name.",
      });
    }
  });
