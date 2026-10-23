import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { WorkspaceField } from "../../components/WorkspaceField";
import type { FormResult } from "../auth/formResult";
import type { profileLoader } from "./loader";

export function ProfilePage() {
  const { user, business } = useLoaderData<typeof profileLoader>();
  const fetcher = useFetcher<FormResult>();
  const formRef = useRef<HTMLFormElement>(null);
  const [cleared, setCleared] = useState<string[]>([]);
  useEffect(() => { if (fetcher.state === "idle" && fetcher.data?.ok) { formRef.current?.reset(); setCleared([]); } }, [fetcher.state, fetcher.data]);
  const errors = fetcher.data && !fetcher.data.ok ? fetcher.data.fieldErrors : {};
  const error = (key: string) => cleared.includes(key) ? undefined : errors[key];
  const pending = fetcher.state !== "idle";
  return <section className="workspace-page workspace-settings-page">
    <header className="app-page-heading"><div><p className="app-eyebrow">SETTINGS</p><h1>My profile</h1><p>View your account and manage your password.</p></div></header>
    <section className="workspace-panel workspace-settings-section" aria-labelledby="profile-info-heading"><div className="workspace-section-heading"><h2 id="profile-info-heading">Profile information</h2><p>Your account details are read only.</p></div><dl className="workspace-info-grid"><div><dt>Full name</dt><dd>{user.full_name}</dd></div><div><dt>Email address</dt><dd>{user.email}</dd></div><div><dt>Role</dt><dd>{user.role === "OWNER" ? "Manager" : "Staff"}</dd></div><div><dt>Business</dt><dd>{business.name}</dd></div></dl></section>
    <section className="workspace-panel workspace-settings-section" aria-labelledby="password-heading"><div className="workspace-section-heading"><h2 id="password-heading">Change password</h2><p>Choose a new password for your account.</p></div><fetcher.Form ref={formRef} method="post" action="/settings/profile" onSubmit={() => setCleared([])} noValidate className="workspace-form workspace-settings-form" onChange={(event) => { if (event.target instanceof HTMLInputElement) setCleared((current) => [...current, event.target.name]); }}>
      <WorkspaceField label="Current password" name="old_password" type="password" autoComplete="current-password" error={error("old_password")} required />
      <div className="workspace-form-grid"><WorkspaceField label="New password" name="new_password" type="password" autoComplete="new-password" error={error("new_password")} hint="Use at least 8 characters." required minLength={8} /><WorkspaceField label="Confirm new password" name="confirm_password" type="password" autoComplete="new-password" error={error("confirm_password")} required /></div>
      {fetcher.data?.message && <p className={fetcher.data.ok ? "workspace-success" : "workspace-form-error"} role={fetcher.data.ok ? "status" : "alert"}>{fetcher.data.message}</p>}
      <div className="workspace-form-actions"><button className="app-primary-button" type="submit" disabled={pending}>{pending ? "Updating…" : "Change password"}</button></div>
    </fetcher.Form></section>
  </section>;
}
