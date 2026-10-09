import type { ReactNode } from "react";

type IconName = "arrow" | "book" | "people" | "check" | "chat" | "clock" | "chart";

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths = {
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    book: <><path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a5 5 0 0 0-4 2 5 5 0 0 0-4-2H3Z" /><path d="M6 8h3m6 0h3M6 12h3m6 0h3" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chat: <><path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 1-5a9 9 0 1 1 17-5Z" /><path d="M8 9h8m-8 4h5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chart: <path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4" />,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand() {
  return (
    <a href="#top" aria-label="CollectFlow home" className="inline-flex shrink-0 items-center gap-3">
      <span className="grid size-10 place-items-center border border-quest-gold-border/60 bg-quest-gold-tint text-quest-gold-border"><Icon name="book" className="size-6" /></span>
      <span className="font-quest-heading text-lg font-semibold tracking-wide">Collect<span className="text-quest-gold-border">Flow</span></span>
    </a>
  );
}

// Account controls intentionally have no destinations until auth screens are built.
function AccountButtons({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${compact ? "account-compact" : ""}`}>
      <button type="button" aria-disabled="true" aria-label="Create account, coming soon" className="welcome-button welcome-button-primary">Create account <Icon name="arrow" className="size-4" /></button>
      <button type="button" aria-disabled="true" aria-label="Sign in, coming soon" className="welcome-button welcome-button-secondary">Sign in</button>
    </div>
  );
}
//  a line before the text gets text or any react node el in it custom desing
function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-5 flex items-center gap-3 font-quest-mono text-[10px] leading-relaxed tracking-[0.16em] text-quest-gold-border uppercase"><span className="h-px w-7 shrink-0 bg-quest-gold" />{children}</p>;
}
// prepares the sample data for the ledger preview section
const sampleCustomers = [
  { initials: "NH", name: "Nour Haddad", note: "Payment promise due today", amount: "$450.00", status: "Due today", style: "text-quest-gold-border bg-quest-gold-tint" },
  { initials: "KM", name: "Karim Market", note: "Next follow-up · Today", amount: "$1,200.00", status: "Follow up", style: "text-quest-parchment bg-quest-elevated" },
  { initials: "RS", name: "Rami Supplies", note: "Cash payment recorded", amount: "$300.00", status: "Recorded", style: "text-quest-success bg-quest-success-tint" },
];
// renders the ledger preview section with sample data
function LedgerPreview() {
  return (
    <figure className="ledger-preview relative min-w-0" aria-label="Illustrative collection overview with sample amounts in US dollars">
      <div className="absolute -inset-3 border border-quest-gold-border-soft sm:-inset-4" aria-hidden="true" />
      <div className="relative border border-quest-border bg-quest-surface shadow-quest-md">
        <figcaption className="flex items-center justify-between gap-3 border-b border-quest-border px-5 py-4 sm:px-6">
            {/* title */}
          <span className="flex items-center gap-2 font-quest-heading text-xs tracking-wide"><Icon name="book" className="size-4 shrink-0 text-quest-gold-border" /> Your collection ledger</span>
          <span className="shrink-0 font-quest-mono text-[9px] tracking-widest text-quest-muted uppercase">Sample view</span>
        </figcaption>
        <div className="p-5 sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div><p className="mb-2 text-sm text-quest-muted">Total outstanding</p><p className="font-quest-mono text-3xl tracking-tight sm:text-4xl">$12,450<span className="text-lg text-quest-muted">.00</span></p></div>
            <span className="border border-quest-border bg-quest-elevated px-2 py-1 font-quest-mono text-[9px] text-quest-muted">USD</span>
          </div>
          <div className="mb-7 grid grid-cols-2 gap-3">
            <div className="border-l-2 border-quest-gold bg-quest-gold-tint p-3"><p className="text-xs text-quest-muted">Overdue balance</p><p className="mt-1 font-quest-mono text-sm text-quest-gold-border sm:text-base">$3,200.00</p></div>
            <div className="border-l-2 border-quest-success/60 bg-quest-success-tint p-3"><p className="text-xs text-quest-muted">Collected this month</p><p className="mt-1 font-quest-mono text-sm sm:text-base">$8,750.00</p></div>
          </div>
          <div className="mb-2 flex items-center justify-between border-b border-quest-border pb-3"><span className="font-quest-heading text-xs tracking-wide">Next on your list</span><Icon name="clock" className="size-4 text-quest-muted" /></div>
          {sampleCustomers.map(row => (
            <div key={row.initials} className="flex items-center gap-3 border-b border-quest-border/60 py-4 last:border-0 last:pb-0">
              <span className="hidden size-9 shrink-0 place-items-center border border-quest-border bg-quest-elevated font-quest-heading text-[10px] text-quest-muted min-[380px]:grid">{row.initials}</span>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{row.name}</p><p className="mt-1 text-[11px] text-quest-muted">{row.note}</p></div>
              <div className="shrink-0 text-right"><p className="font-quest-mono text-xs">{row.amount}</p><span className={`mt-1 inline-block px-2 py-0.5 text-[10px] ${row.style}`}>{row.status}</span></div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-quest-border bg-quest-background/40 px-5 py-3 text-xs text-quest-muted sm:px-6"><span className="size-1.5 shrink-0 bg-quest-gold" /> Every balance has a story. Keep it together.</div>
      </div>
    </figure>
  );
}
// defines the features to be displayed in the workflow section
const features: { number: string; icon: IconName; title: string; text: string; detail: string; illustration: ReactNode }[] = [
  {
    number: "01", icon: "people", title: "Keep each customer’s story together",
    text: "Connect contact details, amounts owed, due dates, notes, and collection history in one customer record. Your team can pick up where the last conversation ended.",
    detail: "One customer. The complete context.",
    illustration: <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center border border-quest-gold-border-soft bg-quest-elevated font-quest-heading text-xs">NH</span><div><p className="text-sm">Nour Haddad</p><p className="text-xs text-quest-muted">Contact · Receivables · History</p></div></div>,
  },
  {
    number: "02", icon: "check", title: "Track promises and payments clearly",
    text: "Record promised amounts and dates, then log Cash or Whish payments against those promises. See what remains unpaid, with payments recorded by your team.",
    detail: "Clear records, no automatic collection.",
    illustration: <div><div className="mb-3 flex justify-between text-xs"><span className="text-quest-muted">Promised <span className="text-quest-parchment">$600</span></span><span className="text-quest-muted">Paid <span className="text-quest-parchment">$400</span></span></div><div className="h-1 bg-quest-elevated"><div className="h-full w-2/3 bg-quest-gold" /></div><p className="mt-2 text-right font-quest-mono text-[10px] text-quest-gold-border">$200 remaining</p></div>,
  },
  {
    number: "03", icon: "chat", title: "Follow up with context",
    text: "See which customers are due for a follow-up, open a WhatsApp conversation, record a note, and set the next follow-up date. Every conversation starts with context.",
    detail: "WhatsApp conversations are handled manually.",
    illustration: <div className="flex items-center gap-3"><Icon name="chat" className="size-7 shrink-0 text-quest-gold-border" /><div><p className="text-sm">“Will pay the balance on Friday.”</p><p className="mt-1 text-xs text-quest-muted">Note saved · Next follow-up: Friday</p></div></div>,
  },
];

function WorkflowSection() {
  return (
    <section id="how-it-works" className="welcome-container py-16 md:py-24" aria-labelledby="workflow-title">
      <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
            <Eyebrow>From the first record to the next follow-up</Eyebrow>
            <h2 id="workflow-title" className="section-title">
                A place for every step.
            </h2>
            </div>
        <p className="max-w-xs text-base/[1.7] text-quest-muted">A connected collection workflow.<br />A little more clarity in every day.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {/* uses the feature array above to display the features */}
        {features.map(feature => (
          <article key={feature.number} className="flex flex-col border border-quest-border bg-quest-surface p-6 sm:p-7">
            <div className="mb-7 flex items-center justify-between"><Icon name={feature.icon} className="size-7 text-quest-gold-border" /><span className="font-quest-mono text-xs text-quest-muted">/ {feature.number}</span></div>
            <h3 className="min-h-14 font-quest-heading text-xl/[1.4] font-semibold">{feature.title}</h3>
            <p className="mt-4 text-base/[1.7] text-quest-muted">{feature.text}</p>
            <div className="mt-auto pt-7"><div className="flex min-h-24 flex-col justify-center border-y border-quest-border py-4">{feature.illustration}</div><p className="mt-4 text-xs text-quest-muted">{feature.detail}</p></div>
          </article>
        ))}
      </div>
      <p className="mt-4 text-right font-quest-mono text-[9px] tracking-wider text-quest-muted uppercase">Illustrative records · Sample data</p>
    </section>
  );
}
// renders the overview section with sample statistics
function OverviewSection() {
  const stats = [
    { label: "Outstanding balance", value: "$12,450", note: "The amount still to collect" },
    { label: "Overdue balance", value: "$3,200", note: "Past the due date" },
    { label: "Cash collected", value: "$5,500", note: "Recorded this month" },
    { label: "Whish collected", value: "$3,250", note: "Recorded this month" },
  ];

  return (
    <section id="overview" className="border-y border-quest-border/70 bg-quest-surface/40" aria-labelledby="overview-title">
      <div className="welcome-container grid items-center gap-12 py-16 md:py-20 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
        <div>
            <Eyebrow>The bigger picture</Eyebrow>
            <h2 id="overview-title" className="section-title">See the collection picture.</h2>
            <p className="mt-5 text-lg/[1.7] text-quest-muted">Know where things stand, and where to focus next.</p>
            <p className="mt-4 text-base/[1.7] text-quest-muted">
                The planned dashboard brings outstanding and overdue balances, money collected, upcoming or broken promises, and follow-ups due into one view.
            </p>
            <p className="mt-6 flex items-center gap-3 text-sm">
                <Icon name="chart" className="size-5 shrink-0 text-quest-gold-border" /> 
                Today, this week, this month, or your own date range.
            </p>
        </div>
        <div className="min-w-0 border border-quest-border bg-quest-surface p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
                <h3 className="font-quest-heading text-sm">At a glance</h3>
                <span className="font-quest-mono text-[9px] tracking-wider text-quest-muted uppercase">
                    Dashboard preview
                </span>
            </div>
            {/* this is where the dashboard preview will be displayed the 4 squares using grid */}
            <div className="grid grid-cols-2 gap-px bg-quest-border">
                {stats.map(stat => <div key={stat.label} className="bg-quest-surface p-3 sm:p-4">
                    <p className="text-xs text-quest-muted">
                        {stat.label}
                    </p>
                    <p className="my-2 font-quest-mono text-xl sm:text-2xl">
                        {stat.value}
                    </p>
                    <p className="text-[11px] text-quest-muted">
                        {stat.note}
                    </p>
                </div>)}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="border border-quest-gold-border-soft bg-quest-gold-tint px-3 py-2">4 upcoming promises</span>
                <span className="border border-quest-red-border/50 bg-quest-error-tint px-3 py-2">2 broken promises</span>
                <span className="border border-quest-border bg-quest-elevated px-3 py-2">6 follow-ups due</span>
            </div>
            <p className="mt-5 text-xs text-quest-muted">Sample amounts in USD, for illustration.</p>
        </div>
      </div>
    </section>
  );
}

export function WelcomePage() {
    return (
    <div id="top" className="welcome-page min-h-screen bg-quest-background font-quest-body text-quest-parchment">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <header className="border-b border-quest-border/70">
            <div className="welcome-container flex min-h-24 flex-wrap items-center justify-between gap-5 py-5">
            <Brand />
            <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm text-quest-muted lg:flex">
                <a href="#how-it-works">How it works</a>
                <a href="#overview">The overview</a>
                <a href="#team">For your team</a></nav>
            <AccountButtons compact />
            </div>
        </header>
        <main id="main-content" tabIndex={-1}>
            <section className="hero-section relative border-b border-quest-border/70" aria-labelledby="hero-title">
            <div className="welcome-container relative grid items-center gap-16 py-16 md:py-24 lg:grid-cols-[1.04fr_1fr] lg:gap-20 lg:py-28">
                <div>
                    <Eyebrow>A clearer way to collect</Eyebrow>
                    <h1 id="hero-title" className="max-w-xl font-quest-heading text-[32px]/[1.2] font-bold sm:text-[40px]/[1.15]">
                        Know what you’re owed
                    <span className="mt-2 block text-quest-gold-border">
                        and what comes next.
                    </span>
                    </h1>
                    <p className="mt-6 max-w-lg text-lg/[1.7] text-quest-muted">
                        CollectFlow brings your customers, receivables, payment promises, payments, and follow-ups into one place. See what needs attention and keep each collection moving.
                    </p>
                    <div className="mt-8"><AccountButtons /></div>
                    <p className="mt-5 text-xs text-quest-muted">Built for small businesses and suppliers in Lebanon.</p>
                </div>
                <div className="mx-3 my-3 min-w-0 sm:mx-4"><LedgerPreview /></div>
            </div>
            </section>
            <div className="border-b border-quest-border/70">
                <div className="welcome-container flex flex-wrap items-center justify-center gap-x-7 gap-y-4 py-6 text-xs text-quest-muted sm:justify-between">
                    <span className="font-quest-heading text-[11px] tracking-wider text-quest-parchment">
                        Less scattered. More connected.
                    </span>
                    {["Customers", "Receivables", "Promises", "Payments", "Follow-ups"].map(
                        item => 
                        <span key={item} className="flex items-center gap-3">
                            <span className="size-1 rotate-45 bg-quest-gold" aria-hidden="true" />
                                {item}
                        </span>
                    )}
                </div>
            </div>
            <WorkflowSection />
            <OverviewSection />
            <section id="team" className="welcome-container grid items-center gap-10 py-16 md:py-24 lg:grid-cols-2 lg:gap-24" aria-labelledby="team-title">
                <div>
                    <Eyebrow>A shared way forward</Eyebrow>
                    <h2 id="team-title" className="section-title">Work as one team.</h2>
                    <p className="mt-5 max-w-lg text-lg/[1.7] text-quest-muted">
                        The business manager adds staff. Both manager and staff can handle day-to-day collection work, with the same customer context close at hand.
                    </p>
                </div>
                <div className="divide-y divide-quest-border border-y border-quest-border">
                    <div className="flex gap-5 py-6">
                        <span className="grid size-11 shrink-0 place-items-center border border-quest-gold-border-soft bg-quest-gold-tint text-quest-gold-border">
                            <Icon name="book" />
                        </span>
                        <div>
                            <h3 className="font-quest-heading text-base">For the business manager</h3>
                            <p className="mt-2 text-sm/[1.7] text-quest-muted">
                                Create an account to register your business, add staff, and manage daily collections.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-5 py-6">
                        <span className="grid size-11 shrink-0 place-items-center border border-quest-border bg-quest-surface text-quest-muted">
                            <Icon name="people" />
                        </span>
                        <div>
                            <h3 className="font-quest-heading text-base">For your staff</h3>
                            <p className="mt-2 text-sm/[1.7] text-quest-muted">
                                Use Sign in with the account your manager creates for you. No business registration needed.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="welcome-container pb-16" aria-labelledby="closing-title">
            <div className="closing-panel relative border border-quest-gold-border-soft bg-quest-surface px-6 py-14 text-center sm:px-12">
                <span className="mx-auto mb-6 block size-2 rotate-45 border border-quest-gold-border" aria-hidden="true" />
                <h2 id="closing-title" className="section-title mx-auto max-w-2xl">Ready for a clearer view of your receivables?</h2>
                <p className="mt-5 text-base text-quest-muted">Your customers. Your collections. A clear next step.</p>
                <div className="mt-8 flex justify-center"><AccountButtons /></div>
            </div>
            </section>
        </main>
        <footer className="border-t border-quest-border/70">
            <div className="welcome-container flex flex-col items-center justify-between gap-5 py-8 sm:flex-row">
                    <Brand />
                    <p className="text-xs text-quest-muted">
                        Built around your business. One record at a time.
                    </p>
                    <a href="#top" className="text-xs text-quest-muted">
                        Back to top ↑
                    </a>
            </div>
        </footer>
    </div>
  );
}
