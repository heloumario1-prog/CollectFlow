import { useEffect, useRef, useState } from "react";
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useSearchParams,
} from "react-router";
import { AuthField } from "../../components/AuthField";
import type { AuthActionResult } from "./action";
import { loginSchema, registerSchema } from "./schema";
import { registrationNotice } from "./registrationNotice";

type FormValues = {
  businessName: string;
  businessPhone: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};
// gets only they key of from values, to use for validation and updating state
type Field = keyof FormValues;

const emptyValues: FormValues = {
  businessName: "",
  businessPhone: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validationError(
  values: FormValues,
  registering: boolean,
  field: Field
) {
  // picks which schema to use based on whether the user is registering or logging in
  const result = (registering ? registerSchema : loginSchema).safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

export function AccountForm({ mode }: { mode: "login" | "register" }) {
  //   by default the form is in login mode, but if the mode prop is "register", then the form is in register mode
  const registering = mode === "register";
  const [values, setValues] = useState(() => ({ ...emptyValues, email: registering ? "" : registrationNotice.email() }));
  useEffect(() => { if (!registering) registrationNotice.clear(); }, [registering]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formError, setFormError] = useState<string | null>(null);
  // form sender state, to disable the submit button and show a loading state
  const actionData = useActionData() as AuthActionResult | undefined;
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const pending = navigation.state !== "idle";
  //   for accessibility
  const headingRef = useRef<HTMLHeadingElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!actionData) return;
    submitted.current = true;
    setErrors(actionData.fieldErrors);
    setFormError(actionData.formError ?? null);
    const firstError = Object.keys(actionData.fieldErrors)[0];
    requestAnimationFrame(() => {
      if (firstError)
        formRef.current
          ?.querySelector<HTMLInputElement>(`[name="${firstError}"]`)
          ?.focus();
      else noticeRef.current?.focus();
    });
  }, [actionData]);
  // updated the form empty values and errors when the mode changes (login/register)
  function update(field: Field, value: string) {
    //  updated the values and errors when the user types in the input fields
    const next = { ...values, [field]: value };
    //  set the new values and errors
    setValues(next);
    // if submitted
    if (submitted.current) {
      // validate the field and set the error message if any
      const nextError = validationError(next, registering, field);
      setErrors((current) => {
        const updated = { ...current };
        if (nextError) updated[field] = nextError;
        else delete updated[field];
        return updated;
      });
      setFormError(null);
    }
  }

  const field = (name: Field) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (value: string) => update(name, value),
  });
  const notice =
    formError ??
    (!registering &&
    !submitted.current &&
    searchParams.get("registered") === "1"
      ? "Your account is ready. Sign in to continue."
      : null);

  return (
    <>
      <title>
        {`  ${
                registering ? "Create your account" : "Sign in"
            } | CollectFlow`
        }
      </title>
      <header className="mb-8">
        <p className="mb-4 flex items-center gap-3 font-quest-mono text-[10px] tracking-[0.18em] text-quest-accent-border uppercase">
          <span className="h-px w-6 bg-quest-accent" aria-hidden="true" />
          {registering ? "Get started" : "Welcome back"}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-quest-heading text-[26px]/[1.3] font-semibold outline-none sm:text-[30px]/[1.3]"
        >
          {registering ? "Create your account" : "Sign in to CollectFlow"}
        </h1>
        <p className="mt-3 text-base/[1.7] text-quest-muted">
          {registering
            ? "A clearer collection day starts here. Create a workspace for your business."
            : "Enter your details to return to your workspace."}
        </p>
      </header>

      <div aria-live="polite" aria-atomic="true">
        {/* if notice is true */}
        {notice && (
          <div
            ref={noticeRef}
            tabIndex={-1}
            className={`mb-6 rounded-quest border border-l-2 p-4 text-sm/[1.6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-quest-accent-border ${
              formError
                ? "border-quest-danger-border/60 bg-quest-error-tint"
                : "border-quest-accent-border-soft border-l-quest-accent bg-quest-accent-tint"
            }`}
          >
            {/* print that he has to go to login and log in  */}
            {notice}
          </div>
        )}
      </div>
        {/* one form but what is shown depends on the mode that is passed */}
      <Form ref={formRef} method="post" noValidate className="space-y-5">
        {/* extra fields for registering if mode = registering */}
        {registering && (
          <>
            <AuthField
              {...field("businessName")}
              label="Business name"
              autoComplete="organization"
              placeholder="Your business name"
            />
            <AuthField
              {...field("businessPhone")}
              label="Business phone"
              type="tel"
              autoComplete="tel"
              placeholder="+961 3 123 456"
              hint="Enter a Lebanese or international phone number."
            />
            <div className="grid grid-cols-2 items-start gap-4">
              <AuthField
                {...field("firstName")}
                label="First name"
                autoComplete="given-name"
                placeholder="First name"
              />
              <AuthField
                {...field("lastName")}
                label="Last name"
                autoComplete="family-name"
                placeholder="Last name"
              />
            </div>
          </>
        )}

        <AuthField
          {...field("email")}
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <AuthField
          {...field("password")}
          label="Password"
          type="password"
          autoComplete={registering ? "new-password" : "current-password"}
          placeholder={
            registering ? "Create a password" : "Enter your password"
          }
          hint={registering ? "Use at least 8 characters." : undefined}
        />
        {/* more fields for registering only */}
        {registering && (
          <AuthField
            {...field("confirmPassword")}
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
          />
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-quest border border-quest-accent-border bg-quest-accent px-6 py-3 text-base font-semibold text-quest-background shadow-quest-sm transition-colors duration-300 hover:bg-quest-accent-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-quest-accent-border active:shadow-quest-glow disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          {pending
            ? registering
              ? "Creating account…"
              : "Signing in…"
            : registering
            ? "Create account"
            : "Sign in"}
          {!pending && (
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 12h15m-6-6 6 6-6 6" />
            </svg>
          )}
        </button>
      </Form>
          
      <p className="mt-7 border-t border-quest-border/70 pt-6 text-center text-sm leading-6 text-quest-muted">
        {registering ? "Already have an account?" : "Don’t have an account?"}{" "}
        <Link
          to={registering ? "/login" : "/register"}
          className="inline-block font-semibold text-quest-accent-border underline decoration-quest-accent-border/40 underline-offset-4 hover:text-quest-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-quest-accent-border"
        >
          {registering ? "Sign in" : "Create account"}
        </Link>
      </p>

    </>
  );
}
