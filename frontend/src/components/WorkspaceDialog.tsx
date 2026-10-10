import { useEffect, useRef, type ReactNode } from "react";

type Props = { title: string; description: string; children: ReactNode; onClose: () => void };

export function WorkspaceDialog({ title, description, children, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>("input, button")?.focus();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return <dialog ref={ref} className="workspace-dialog" aria-labelledby="workspace-dialog-title" aria-describedby="workspace-dialog-description" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === ref.current) onClose(); }}>
    <div className="workspace-dialog-body">
      <div className="workspace-dialog-header"><div><p className="app-eyebrow">TEAM</p><h2 id="workspace-dialog-title">{title}</h2><p id="workspace-dialog-description">{description}</p></div><button type="button" className="workspace-icon-button" aria-label="Close dialog" onClick={onClose}>×</button></div>
      {children}
    </div>
  </dialog>;
}
