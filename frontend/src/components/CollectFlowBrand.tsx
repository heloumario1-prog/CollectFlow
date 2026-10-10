import { Link } from "react-router";

export function CollectFlowBrand() {
  return (
    <Link to="/" aria-label="CollectFlow home" className="inline-flex shrink-0 items-center gap-3 text-quest-parchment focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-quest-gold-border">
      <span className="grid size-10 place-items-center border border-quest-gold-border/60 bg-quest-gold-tint text-quest-gold-border">
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a5 5 0 0 0-4 2 5 5 0 0 0-4-2H3Z" />
          <path d="M6 8h3m6 0h3M6 12h3m6 0h3" />
        </svg>
      </span>
      <span className="font-quest-heading text-lg font-semibold tracking-wide">Collect<span className="text-quest-gold-border">Flow</span></span>
    </Link>
  );
}
