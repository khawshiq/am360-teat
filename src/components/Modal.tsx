"use client";

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          <b>{title}</b>
          <button className="secondary" onClick={onClose} style={{ padding: "4px 12px" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
