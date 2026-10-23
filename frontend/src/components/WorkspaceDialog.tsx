import { useEffect, useRef, type ReactNode } from "react";

type Props = { title: string; description: string; children: ReactNode; onClose: () => void };

export function WorkspaceDialog({ title, description, children, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>("input, button")?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return <dialog ref={ref} className="workspace-dialog" aria-labelledby="workspace-dialog-title" aria-describedby="workspace-dialog-description" onKeyDown={(event) => {
    if (event.key !== "Tab") return;
    const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href]') ?? []).filter(element => element.tabIndex >= 0 && element.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (first && ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last))) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  }} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === ref.current) onClose(); }}>
    <div className="workspace-dialog-body">
      <div className="workspace-dialog-header"><div><p className="app-eyebrow">TEAM</p><h2 id="workspace-dialog-title">{title}</h2><p id="workspace-dialog-description">{description}</p></div><button type="button" className="workspace-icon-button" aria-label="Close dialog" onClick={onClose}>×</button></div>
      {children}
    </div>
  </dialog>;
}
