import { StatusBadge } from "../../components/StatusBadge";
import { useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { WorkspaceDialog } from "../../components/WorkspaceDialog";
import { WorkspaceField } from "../../components/WorkspaceField";
import type { StaffRead } from "../../type/staff";
import type { FormResult } from "../auth/formResult";
import type { staffLoader } from "./loader";

type Mode = "create" | "edit" | "reset" | "deactivate" | "reactivate";
type Selection = { mode: Mode; staff?: StaffRead };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Beirut", year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function StaffDialog({ selection, onClose, onSuccess }: { selection: Selection; onClose: () => void; onSuccess: (message: string) => void }) {
  const fetcher = useFetcher<FormResult>();
  const detail = useFetcher<StaffRead>();
  const [cleared, setCleared] = useState<string[]>([]);
  const { mode, staff } = selection;
  useEffect(() => {
    if ((mode === "edit" || mode === "reset") && staff) detail.load(`/staff/${staff.id}`);
  }, [mode, staff?.id]);
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) onSuccess(fetcher.data.message ?? "Changes saved.");
  }, [fetcher.state, fetcher.data, onSuccess]);
  const data = mode === "edit" || mode === "reset" ? detail.data?.id === staff?.id ? detail.data : undefined : staff;
  const errors = fetcher.data && !fetcher.data.ok ? fetcher.data.fieldErrors : {};
  const error = (name: string) => cleared.includes(name) ? undefined : errors[name];
  const changed = (name: string) => setCleared((current) => [...current, name]);
  const pending = fetcher.state !== "idle";
  const title = mode === "create" ? "Add staff" : mode === "edit" ? "Edit staff" : mode === "reset" ? "Reset password" : mode === "deactivate" ? "Deactivate staff?" : "Reactivate staff?";
  const description = mode === "create" ? "Create an account for a person on your team." : mode === "edit" ? "Update this staff member's name and email." : mode === "reset" ? "Set a new password for this staff member." : mode === "deactivate" ? `${staff?.full_name} will lose access on their next request.` : `${staff?.full_name} will be able to sign in again.`;
  return <WorkspaceDialog title={title} description={description} onClose={() => { if (!pending) onClose(); }}>
    {detail.state !== "idle" && (mode === "edit" || mode === "reset") && !data ? <p className="workspace-dialog-loading" role="status">Loading staff details…</p> : null}
    {detail.data === undefined && detail.state === "idle" && (mode === "edit" || mode === "reset") ? <p className="workspace-dialog-loading" role="status">Loading staff details…</p> : null}
    {(mode === "create" || mode === "deactivate" || mode === "reactivate" || data) && <fetcher.Form method="post" action="/staff" noValidate className="workspace-form" onSubmit={() => setCleared([])} onChange={(event) => { const target = event.target; if (target instanceof HTMLInputElement) changed(target.name); }}>
      <input type="hidden" name="intent" value={mode} />
      {staff && <input type="hidden" name="id" value={staff.id} />}
      {(mode === "create" || mode === "edit") && <>
        <WorkspaceField label="Full name" name="full_name" autoComplete="name" defaultValue={data?.full_name} error={error("full_name")} required maxLength={150} />
        <WorkspaceField label="Email address" name="email" type="email" autoComplete="email" defaultValue={data?.email} error={error("email")} required />
      </>}
      {mode === "create" && <WorkspaceField label="Initial password" name="password" type="password" autoComplete="new-password" error={error("password")} hint="Use at least 8 characters. Share it outside CollectFlow through a secure channel." required minLength={8} />}
      {mode === "reset" && <><WorkspaceField label="New password" name="new_password" type="password" autoComplete="new-password" error={error("new_password")} required minLength={8} /><WorkspaceField label="Confirm password" name="confirm_password" type="password" autoComplete="new-password" error={error("confirm_password")} required /></>}
      {fetcher.data && !fetcher.data.ok && <div className="workspace-form-error" role="alert">
        <p>{fetcher.data.message}</p>
        {Object.keys(errors).length > 0 && <ul>{Object.entries(errors).map(([name, message]) => <li key={name}>{message}</li>)}</ul>}
      </div>}
      <div className="workspace-form-actions"><button className="workspace-secondary-button" type="button" onClick={onClose} disabled={pending}>Cancel</button><button className={mode === "deactivate" ? "workspace-danger-button" : "app-primary-button"} type="submit" disabled={pending}>{pending ? "Working…" : mode === "create" ? "Add staff" : mode === "edit" ? "Save changes" : mode === "reset" ? "Reset password" : mode === "deactivate" ? "Deactivate" : "Reactivate"}</button></div>
    </fetcher.Form>}
  </WorkspaceDialog>;
}

export function StaffPage() {
  const { staff } = useLoaderData<typeof staffLoader>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [notice, setNotice] = useState("");
  const shown = useMemo(() => staff.filter((person) => `${person.full_name} ${person.email}`.toLowerCase().includes(search.trim().toLowerCase()) && (status === "all" || (status === "active") === person.is_active)), [staff, search, status]);
  return <section className="workspace-page">
    <header className="app-page-heading"><div><p className="app-eyebrow">TEAM MANAGEMENT</p><h1>Staff</h1><p>Manage the people who work in your CollectFlow workspace.</p></div><button type="button" className="app-primary-button" onClick={() => { setNotice(""); setSelection({ mode: "create" }); }}><span aria-hidden="true">+</span> Add staff</button></header>
    {notice && <p className="workspace-success" role="status">{notice}</p>}
    <div className="workspace-panel">
      <div className="workspace-toolbar"><div><h2>Team members</h2><p>{shown.length} {shown.length === 1 ? "person" : "people"} shown</p></div><div className="workspace-toolbar-controls"><label className="workspace-search"><span className="sr-only">Search staff</span><input type="search" placeholder="Search by name or email" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="workspace-filter"><span className="sr-only">Filter staff by status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div></div>
      <div className="workspace-table-head" aria-hidden="true"><span>Staff member</span><span>Status</span><span>Created</span><span>Actions</span></div>
      {shown.map((person) => <div className="workspace-staff-row" key={person.id}><div className="workspace-person"><span className="workspace-person-avatar" aria-hidden="true">{person.full_name.trim()[0]?.toUpperCase() ?? "S"}</span><div><strong>{person.full_name}</strong><span>{person.email}</span></div></div><div className="workspace-cell"><span className="workspace-cell-label">Status</span><StatusBadge status={person.is_active ? "Active" : "Inactive"} /></div><div className="workspace-cell"><span className="workspace-cell-label">Created</span><time dateTime={person.created_at}>{formatDate(person.created_at)}</time></div><div className="workspace-row-actions"><button type="button" onClick={() => setSelection({ mode: "edit", staff: person })}>Edit</button><button type="button" onClick={() => setSelection({ mode: "reset", staff: person })}>Reset password</button><button type="button" className={person.is_active ? "workspace-link-danger" : ""} onClick={() => setSelection({ mode: person.is_active ? "deactivate" : "reactivate", staff: person })}>{person.is_active ? "Deactivate" : "Reactivate"}</button></div></div>)}
      {shown.length === 0 && <div className="workspace-empty"><strong>{staff.length === 0 ? "No staff members yet" : "No matching staff"}</strong><p>{staff.length === 0 ? "Add someone to start building your team." : "Try a different search or status filter."}</p></div>}
    </div>
    {selection && <StaffDialog key={`${selection.mode}-${selection.staff?.id ?? "new"}`} selection={selection} onClose={() => setSelection(null)} onSuccess={(message) => { setSelection(null); setNotice(message); }} />}
  </section>;
}
