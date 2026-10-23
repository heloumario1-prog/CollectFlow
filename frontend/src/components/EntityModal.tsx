import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";

type EntityModalProps = {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
};

export function EntityModal({
  title,
  description,
  onClose,
  children,
}: EntityModalProps) {
  const modalRef = useRef<HTMLElement>(null);
  // Read the latest close handler without restarting the opening focus effect.
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const modal = modalRef.current;
    const trigger = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const background = new Map<HTMLElement, boolean>();
    let ancestor = modal?.parentElement;
    while (ancestor && ancestor !== document.body) {
      for (const sibling of Array.from(ancestor.parentElement?.children ?? [])) {
        if (sibling !== ancestor && sibling instanceof HTMLElement) {
          background.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      }
      ancestor = ancestor.parentElement;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === "Tab" && modal) {
        const controls = Array.from(modal.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        )).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) {
          event.preventDefault();
          modal.focus();
        } else if (!modal.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === first) ||
          (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    (modal?.querySelector<HTMLElement>('button:not(:disabled), a[href], input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled)') ?? modal)?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      for (const [element, inert] of background) element.inert = inert;
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="entity-modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entity-modal-title"
        aria-describedby="entity-modal-description"
      >
        <header className="entity-modal-header">
          <div>
            <h2 id="entity-modal-title">{title}</h2>
            <p id="entity-modal-description">{description}</p>
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}
