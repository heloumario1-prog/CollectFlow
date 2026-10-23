import { useState } from "react";

type AuthFieldProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "tel";
  autoComplete: string;
  placeholder?: string;
  hint?: string;
  error?: string;
};

// fields for login and register forms, with labels, hints, and error messages. Password fields have a toggle to show/hide the password.
export function AuthField({
  name,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  hint,
  error,
}: AuthFieldProps) {
    // button to toggle password visibility
  const [revealed, setRevealed] = useState(false);
  const id = `account-${name}`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type === "password" && revealed ? "text" : type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          className={`auth-input min-h-12 w-full min-w-0 rounded-quest border bg-quest-surface px-4 py-3 text-base leading-6 text-quest-text placeholder:text-quest-muted ${
            type === "password" ? "pr-14" : ""
          } ${
            error
              ? "border-quest-danger-border ring-1 ring-quest-danger-border"
              : "border-quest-border"
          }`}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            aria-label={`${revealed ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-1 my-auto grid size-11 cursor-pointer place-items-center rounded-quest text-quest-muted hover:text-quest-text focus-visible:outline-2 focus-visible:outline-quest-accent-border"
          >
            <svg
              className="size-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {revealed && <path d="m3 3 18 18" />}
            </svg>
          </button>
        )}
      </div>
      {/* error validation message */}
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-sm leading-5 text-quest-danger-text"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className="mt-1.5 text-xs leading-5 text-quest-muted"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
