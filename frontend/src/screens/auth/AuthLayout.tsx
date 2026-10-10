import { Outlet } from "react-router";
import { CollectFlowBrand } from "../../components/CollectFlowBrand";
// main layout for auth pages (login, register)
export function AuthLayout() {
  return (
    <div className="auth-page min-h-svh bg-quest-background font-quest-body text-quest-parchment lg:grid lg:grid-cols-2">
      <a href="#account-form" className="skip-link">Skip to form</a>
      <aside className="auth-brand-panel relative hidden flex-col justify-between overflow-hidden border-r border-quest-gold-border-soft bg-quest-surface p-12 lg:flex xl:p-16" aria-label="About CollectFlow">
        <div className="relative z-10"><CollectFlowBrand /></div>
        <div className="relative z-10 mx-auto w-full max-w-lg py-20">
          <div className="mb-8 flex items-center gap-4" aria-hidden="true">
            <span className="h-px w-12 bg-quest-gold" />
            <span className="size-2 rotate-45 border border-quest-gold-border" />
            <span className="h-px w-12 bg-quest-gold-border-soft" />
          </div>
          <p className="mb-5 font-quest-mono text-[10px] tracking-[0.18em] text-quest-gold-border uppercase">Receivables, in good flow</p>
          <h2 className="max-w-md font-quest-heading text-[40px]/[1.2] font-semibold xl:text-[48px]/[1.18]">Make every<br />follow-up <span className="text-quest-gold-border">count.</span></h2>
          <p className="mt-6 max-w-sm text-lg/[1.75] text-quest-muted">Bring your business receivables together. Keep every promise, payment, and next step in view.</p>
          <div className="mt-10 flex items-center gap-3 text-xs text-quest-muted">
            <span>Clarity</span><span className="size-1 rotate-45 bg-quest-gold" aria-hidden="true" />
            <span>Continuity</span><span className="size-1 rotate-45 bg-quest-gold" aria-hidden="true" />
            <span>Confidence</span>
          </div>
        </div>
        <p className="relative z-10 border-t border-quest-gold-border-soft pt-6 text-sm text-quest-muted">A clearer view of what you’re owed.</p>
        <div className="pointer-events-none absolute -right-40 -bottom-44 size-[480px] rotate-45 border border-quest-gold-border/10 p-8" aria-hidden="true"><div className="size-full border border-quest-gold-border/10 p-8"><div className="size-full border border-quest-gold-border/10" /></div></div>
      </aside>
      <main id="account-form" tabIndex={-1} className="flex min-h-svh min-w-0 flex-col justify-start px-6 py-10 outline-none sm:px-12 sm:py-12 lg:justify-center xl:px-20">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-12 lg:hidden"><CollectFlowBrand /></div>
          {/* where the main content goes  (login, register) */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
