import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { WorkspaceField } from "../../components/WorkspaceField";
import type { FormResult } from "../auth/formResult";
import type { businessLoader } from "./loader";

export function BusinessPage() {
  const business = useLoaderData<typeof businessLoader>();
  const fetcher = useFetcher<FormResult>();
  const [cleared, setCleared] = useState<string[]>([]);
  const errors = fetcher.data && !fetcher.data.ok ? fetcher.data.fieldErrors : {};
  const error = (key: string) => cleared.includes(key) ? undefined : errors[key];
  const pending = fetcher.state !== "idle";
  return <section className="workspace-page workspace-settings-page">
    <header className="app-page-heading"><div><p className="app-eyebrow">SETTINGS</p><h1>Business settings</h1><p>Keep your workspace details up to date.</p></div></header>
    <section className="workspace-panel workspace-settings-section" aria-labelledby="business-info-heading"><div className="workspace-section-heading"><h2 id="business-info-heading">Business information</h2><p>These details identify your CollectFlow workspace.</p></div><fetcher.Form key={`${business.id}-${business.name}-${business.phone_e164}`} method="post" action="/settings/business" noValidate className="workspace-form workspace-settings-form" onChange={(event) => { if (event.target instanceof HTMLInputElement) setCleared((current) => [...current, event.target.name]); }}>
      <div className="workspace-form-grid"><WorkspaceField label="Business name" name="name" defaultValue={business.name} error={error("name")} required maxLength={150} /><WorkspaceField label="Business phone" name="phone_e164" type="tel" autoComplete="tel" defaultValue={business.phone_e164 ?? ""} error={error("phone_e164")} hint="Include country code, for example +961…" required /></div>
      <dl className="workspace-info-grid workspace-fixed-settings"><div><dt>Currency</dt><dd>{business.base_currency}</dd></div><div><dt>Business timezone</dt><dd>{business.timezone}</dd></div></dl>
      {fetcher.data?.message && <p className={fetcher.data.ok ? "workspace-success" : "workspace-form-error"} role={fetcher.data.ok ? "status" : "alert"}>{fetcher.data.message}</p>}
      <div className="workspace-form-actions"><button className="app-primary-button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button></div>
    </fetcher.Form></section>
  </section>;
}
