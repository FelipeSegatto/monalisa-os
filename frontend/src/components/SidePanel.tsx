import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import "./SidePanel.css";

interface Props {
  eyebrow: string;
  title: string;
  close: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function SidePanel({ eyebrow, title, close, children, footer, wide = false }: Props) {
  return createPortal(
    <div
      className="overlay"
      role="presentation"
      onMouseDown={close}
    >
      <aside
        className={wide ? "side-panel side-panel--wide" : "side-panel"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-head">
          <div>
            <p className="page-header-eyebrow">{eyebrow}</p>
            <h2 className="panel-title">{title}</h2>
          </div>
          <button type="button" className="text-button" onClick={close}>
            Fechar ×
          </button>
        </div>
        <div className="panel-body">{children}</div>
        {footer ? <div className="panel-footer">{footer}</div> : null}
      </aside>
    </div>,
    document.body,
  );
}
