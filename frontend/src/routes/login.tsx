import { useState, type FormEvent } from "react";
import { Link } from "react-router";

type LoginForm = {
  email: string;
  password: string;
};

type LoginErrors = Partial<Record<keyof LoginForm, string>>;

const emptyForm: LoginForm = {
  email: "",
  password: "",
};

function validateLogin(form: LoginForm): LoginErrors {
  const errors: LoginErrors = {};

  if (!form.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.password) errors.password = "Enter your password.";

  return errors;
}

export function LoginPage() {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const updateField = (field: keyof LoginForm, value: string) => {
    const updatedForm = { ...form, [field]: value };
    setForm(updatedForm);
    setShowInfo(false);
    if (hasSubmitted) setErrors(validateLogin(updatedForm));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);

    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    setShowInfo(Object.keys(validationErrors).length === 0);
  };

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
            <p className="register-eyebrow">WELCOME BACK</p>
            <h2>Sign in to CollectFlow</h2>
            <p>Enter your details to continue to your workspace.</p>
          </header>

          {showInfo && (
            <div className="login-info" role="status">
              <strong>Login form is ready.</strong>
              <span>
                Authentication is not connected yet, so you have not been signed
                in. No account credentials were sent or stored.
              </span>
            </div>
          )}

          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <div className="register-field">
              <label htmlFor="loginEmail">Email address</label>
              <input
                id="loginEmail"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                required
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "loginEmail-error" : undefined}
              />
              {errors.email && (
                <p className="register-error" id="loginEmail-error">{errors.email}</p>
              )}
            </div>

            <div className="register-field">
              <label htmlFor="loginPassword">Password</label>
              <input
                id="loginPassword"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "loginPassword-error" : undefined}
              />
              {errors.password && (
                <p className="register-error" id="loginPassword-error">{errors.password}</p>
              )}
            </div>

            <button className="register-submit" type="submit">Sign in</button>
          </form>

          <p className="register-signin">
            Don’t have an account? <Link to="/register">Create account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
