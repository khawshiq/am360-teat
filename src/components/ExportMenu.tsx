"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { saveBlob } from "@/lib/download";

// One export control for every list: CSV, Excel, PDF. The bytes come from the server
// (/api/exports), so all three formats carry the same academy letterhead and the same
// derived fee status.
//
// A 402 on Excel/PDF is not an error to show here — the client already fired the global
// plan-limit event, so UpgradeModal takes over. Only real failures land in `err`.
export default function ExportMenu({
  type, branchId, date, disabled,
}: {
  type: "students" | "attendance" | "fees";
  branchId?: string;
  date?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const run = async (format: "csv" | "xlsx" | "pdf") => {
    setErr(""); setBusy(format);
    try {
      const { blob, filename } = await api.exportReport({ type, format, branch_id: branchId, date });
      saveBlob(blob, filename);
      setOpen(false);
    } catch (e: any) {
      if (e.code !== "PLAN_LIMIT") setErr(e.message);   // 402 → UpgradeModal, not an inline error
      else setOpen(false);
    } finally { setBusy(""); }
  };

  return (
    <div ref={box} style={{ position: "relative", display: "inline-block" }}>
      <button className="secondary" onClick={() => setOpen(o => !o)} disabled={disabled}
              aria-haspopup="menu" aria-expanded={open}>
        Export ▾
      </button>
      {open && (
        <div className="menu" role="menu">
          <button className="menu-item" role="menuitem" onClick={() => run("csv")} disabled={!!busy}>
            <span>CSV</span><span className="muted">{busy === "csv" ? "…" : "Raw data"}</span>
          </button>
          <button className="menu-item" role="menuitem" onClick={() => run("xlsx")} disabled={!!busy}>
            <span>Excel</span><span className="muted">{busy === "xlsx" ? "…" : ".xlsx"}</span>
          </button>
          <button className="menu-item" role="menuitem" onClick={() => run("pdf")} disabled={!!busy}>
            <span>PDF</span><span className="muted">{busy === "pdf" ? "…" : "Printable"}</span>
          </button>
        </div>
      )}
      {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
    </div>
  );
}
