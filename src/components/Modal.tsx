import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({ children, onClose, className = "" }: { children: ReactNode; onClose: () => void; className?: string }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal-card ${className}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close icon-plain" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({
  message, confirmText, tone = "purple", onConfirm, onClose, busy
}: {
  message: ReactNode;
  confirmText: string;
  tone?: "green" | "red" | "purple";
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Modal onClose={onClose} className="confirm-modal">
      <div className="confirm-message">{message}</div>
      <div className="confirm-actions">
        <button className="btn secondary" onClick={onClose}>Cancel</button>
        <button className={`btn confirm ${tone}`} disabled={busy} onClick={onConfirm}>{busy ? "Please wait…" : confirmText}</button>
      </div>
    </Modal>
  );
}
