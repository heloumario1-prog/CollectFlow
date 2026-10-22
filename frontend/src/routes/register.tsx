import { useState, type FormEvent } from "react";
import { Link } from "react-router";

type RegistrationForm = {
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegistrationField = keyof RegistrationForm;
type RegistrationErrors = Partial<Record<RegistrationField, string>>;

const emptyForm: RegistrationForm = {
  businessName: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validateRegistration(form: RegistrationForm): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (!form.businessName.trim()) errors.businessName = "Enter your business name.";
  if (!form.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!form.lastName.trim()) errors.lastName = "Enter your last name.";
  if (!form.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (form.password.length < 8) {
    errors.password = "Use at least 8 characters for your password.";
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function RegisterPage() {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const updateField = (field: RegistrationField, value: string) => {
    const updatedForm = { ...form, [field]: value };
    setForm(updatedForm);
    setShowSuccess(false);
    if (hasSubmitted) setErrors(validateRegistration(updatedForm));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);

    const validationErrors = validateRegistration(form);
    setErrors(validationErrors);
    setShowSuccess(Object.keys(validationErrors).length === 0);
  };

  const fieldProps = (field: RegistrationField) => ({
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <main className="register-page">
      <section className="register-brand-panel" aria-label="CollectFlow">
        <Link className="register-brand" to="/" aria-label="CollectFlow home">
          <span className="register-brand-icon" aria-hidden="true">C</span>
          <span>CollectFlow</span>
        </Link>
        <div className="register-brand-copy">
          <p className="register-eyebrow">RECEIVABLES, IN GOOD FLOW</p>
          <h1>Make every follow-up count.</h1>
          <p>
            Bring your business receivables together and keep every promise,
            payment, and next step in view.
          </p>
        </div>
        <span className="register-panel-note">A clearer view of what you’re owed.</span>
      </section>

      <section className="register-form-panel">
        <div className="register-form-wrap">
          <Link className="register-mobile-brand" to="/" aria-label="CollectFlow home">
            <span className="register-brand-icon" aria-hidden="true">C</span>
            <span>CollectFlow</span>
          </Link>

          <header className="register-heading">
            <p className="register-eyebrow">GET STARTED</p>
            <h2>Create your account</h2>
            <p>Create a CollectFlow workspace for your business.</p>
          </header>

          {showSuccess && (
            <div className="register-success" role="status">
              <strong>Registration form submitted successfully.</strong>
              <span>
                Your details are ready for the next step. No account has been
                created because registration is not connected yet.
              </span>
            </div>
          )}

          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <div className="register-field">
              <label htmlFor="businessName">Business name</label>
              <input
                {...fieldProps("businessName")}
                id="businessName"
                name="businessName"
                type="text"
                autoComplete="organization"
                value={form.businessName}
                onChange={(event) => updateField("businessName", event.target.value)}
                required
              />
              {errors.businessName && (
                <p className="register-error" id="businessName-error">{errors.businessName}</p>
              )}
            </div>

            <div className="register-name-fields">
              <div className="register-field">
                <label htmlFor="firstName">First name</label>
                <input
                  {...fieldProps("firstName")}
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                  required
                />
                {errors.firstName && (
                  <p className="register-error" id="firstName-error">{errors.firstName}</p>
                )}
              </div>

              <div className="register-field">
                <label htmlFor="lastName">Last name</label>
                <input
                  {...fieldProps("lastName")}
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                  required
                />
                {errors.lastName && (
                  <p className="register-error" id="lastName-error">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="email">Email address</label>
              <input
                {...fieldProps("email")}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                required
              />
              {errors.email && (
                <p className="register-error" id="email-error">{errors.email}</p>
              )}
            </div>

            <div className="register-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
                minLength={8}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : "password-hint"}
              />
              {errors.password ? (
                <p className="register-error" id="password-error">{errors.password}</p>
              ) : (
                <p className="register-hint" id="password-hint">Use at least 8 characters.</p>
              )}
            </div>

            <div className="register-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                {...fieldProps("confirmPassword")}
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                required
              />
              {errors.confirmPassword && (
                <p className="register-error" id="confirmPassword-error">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button className="register-submit" type="submit">Create account</button>
          </form>

          <p className="register-signin">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
