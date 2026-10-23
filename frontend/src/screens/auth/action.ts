import { data, redirect, type ActionFunctionArgs } from "react-router";
import { ApiError } from "../../api/client";
import type { LoginWrite, RegisterWrite } from "../../type/auth";
import { loginSchema, registerSchema } from "./schema";
import { authService } from "./service";
import { registrationNotice } from "./registrationNotice";
// specifies the structure of the result returned by the authentication actions
export type AuthActionResult = {
  fieldErrors: Record<string, string>;
  formError?: string;
};

function values(form: FormData) {
    // arrow function that retrieves the value of a specific key
  const get = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    businessName: get("businessName"),
    businessPhone: get("businessPhone"),
    firstName: get("firstName"),
    lastName: get("lastName"),
    email: get("email"),
    password: get("password"),
    confirmPassword: get("confirmPassword"),
  };
}
// function that processes validation errors and returns an AuthActionResult object
function validationErrors(
  issues: { path: PropertyKey[]; message: string }[]
): AuthActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return {
    fieldErrors,
    formError: "Please check the highlighted fields below.",
  };
}

function apiErrors(error: ApiError): AuthActionResult {
  const aliases: Record<string, string> = {
    "business.name": "businessName",
    "business.phone_e164": "businessPhone",
    "owner.full_name": "firstName",
    "owner.email": "email",
    "owner.password": "password",
  };
  const fieldErrors: Record<string, string> = {};
  for (const [path, message] of Object.entries(error.fields)) {
    const field = aliases[path] ?? path;
    if (
      [
        "businessName",
        "businessPhone",
        "firstName",
        "lastName",
        "email",
        "password",
        "confirmPassword",
      ].includes(field)
    )
      fieldErrors[field] = message;
  }
  return {
    fieldErrors,
    formError: Object.keys(fieldErrors).length
      ? "Please check the highlighted fields below."
      : error.message,
  };
}

function failed(error: unknown) {
  if (error instanceof ApiError)
    return data<AuthActionResult>(apiErrors(error), {
      status: error.status >= 400 ? error.status : 503,
    });
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  return data<AuthActionResult>(
    {
      fieldErrors: {},
      formError: "We couldn't complete your request. Please try again.",
    },
    { status: 503 }
  );
}

export async function loginAction({ request }: ActionFunctionArgs) {
  const parsed = loginSchema.safeParse(values(await request.formData()));
  //   didn't pass validation, return the validation errors with a 400 status code
  if (!parsed.success)
    return data<AuthActionResult>(validationErrors(parsed.error.issues), {
      status: 400,
    });

  const payload: LoginWrite = parsed.data;

  try {
    // calls login method from authService to send a POST request
    await authService.login(payload, request.signal);
    return redirect("/dashboard");
  } catch (error) {
    return failed(error);
  }
}

export async function registerAction({ request }: ActionFunctionArgs) {
  const parsed = registerSchema.safeParse(values(await request.formData()));
  if (!parsed.success)
    return data<AuthActionResult>(validationErrors(parsed.error.issues), {
      status: 400,
    });
  // creates the payload object for the registration request
  const payload: RegisterWrite = {
    business: {
      name: parsed.data.businessName,
      phone_e164: parsed.data.businessPhone,
    },
    owner: {
      full_name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      email: parsed.data.email,
      password: parsed.data.password,
    },
  };

  try {
    await authService.register(payload, request.signal);
    registrationNotice.setEmail(payload.owner.email);
    return redirect("/login?registered=1");
  } catch (error) {
    return failed(error);
  }
}
// just send the rquest to the logout endpoint
export async function logoutAction({ request }: ActionFunctionArgs) {
  try {
    await authService.logout(request.signal);
    return redirect("/login");
  } catch (error) {
    return failed(error);
  }
}
