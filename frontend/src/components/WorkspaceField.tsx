import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export function WorkspaceField({ label, error, hint, id, name, ...input }: Props) {
  const fieldId = id ?? name;
  return <div className="workspace-field">
    <label htmlFor={fieldId}>{label}</label>
    <input {...input} id={fieldId} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined} />
    {error && <p className="workspace-field-error" id={`${fieldId}-error`}>{error}</p>}
    {!error && hint && <p className="workspace-field-hint" id={`${fieldId}-hint`}>{hint}</p>}
  </div>;
}
