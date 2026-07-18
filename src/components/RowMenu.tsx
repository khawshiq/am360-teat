"use client";
import { useEffect, useRef, useState } from "react";

// A compact "⋮" kebab that collapses a list row's actions into a dropdown, so a row
// shows one icon instead of three competing buttons. Same .menu / .menu-item vocabulary
// as ExportMenu; closes on outside-click or Escape. Children get a `close` callback so
// each item can dismiss the menu after it fires.
export default function RowMenu({
  children, label = "Actions",
}: {
  children: (close: () => void) => React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={box} style={{ position: "relative", display: "inline-block" }}>
      <button className="icon-btn" onClick={() => setOpen(o => !o)}
              aria-haspopup="menu" aria-expanded={open} aria-label={label}>⋮</button>
      {open && (
        <div className="menu" role="menu" style={{ left: "auto", right: 0 }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
