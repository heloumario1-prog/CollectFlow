import { useEffect, useRef, type ReactNode } from "react";

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    modalRef.current?.querySelector<HTMLElement>("button, a")?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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