"use client";
import { useState } from "react";
import { sa } from "@/lib/saclient";

// One-off maintenance control (Super Admin). Re-anchors existing fees onto the student's
// admission-day billing cycle. Preview always runs first and writes nothing — the Apply
// button only appears once you have seen exactly what would change.
export default function FeeDueDateBackfill() {
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const run = async (apply: boolean) => {
    setErr(""); setBusy(apply ? "apply" : "preview");
    try {
      const r = await sa.backfillFeeDueDates(apply);
      setRes(r); setDone(apply);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(""); }
  };

  const confirmApply = () => {
    if (!res) return;
    if (!confirm(`Rewrite the due date on ${res.would_change} fee(s) across all academies? This cannot be undone automatically.`)) return;
    run(true);
  };

  return (
    <div className="card">
      <div className="section-head">
        <span className="section-title">Maintenance — fee due dates</span>
      </div>
      <p className="auth-note" style={{ marginTop: 0 }}>
        Re-anchors existing fees onto each student&apos;s admission-day billing cycle. Fees created
        before that rule carry an end-of-month due date. Preview writes nothing; it is safe to
        re-run, and a paid fee never changes status.
      </p>

      {err && <div className="err">{err}</div>}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="secondary" onClick={() => run(false)} disabled={!!busy}>
          {busy === "preview" ? "Checking…" : "Preview changes"}
        </button>
        {res && !done && res.would_change > 0 && (
          <button onClick={confirmApply} disabled={!!busy}>
            {busy === "apply" ? "Applying…" : `Apply to ${res.would_change} fee(s)`}
          </button>
        )}
      </div>

      {res && (
        <div style={{ marginTop: 14 }}>
          {done && <div style={{ color: "var(--ok)", fontSize: 13.5, marginBottom: 10 }}>Backfill applied — {res.would_change} fee(s) updated.</div>}
          {!done && res.would_change === 0 && <div className="muted" style={{ fontSize: 13.5, marginBottom: 10 }}>Nothing to change — every fee is already on the right date.</div>}

          <div className="muted" style={{ fontSize: 13 }}>
            Scanned {res.scanned} · {done ? "changed" : "would change"} {res.would_change} · already correct {res.unchanged}
            {res.orphaned ? ` · skipped ${res.orphaned} orphaned` : ""}
          </div>
          {(res.newly_overdue > 0 || res.no_longer_overdue > 0) && (
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {res.newly_overdue > 0 && <span style={{ color: "var(--warn)" }}>{res.newly_overdue} fee(s) become overdue</span>}
              {res.newly_overdue > 0 && res.no_longer_overdue > 0 && " · "}
              {res.no_longer_overdue > 0 && <span>{res.no_longer_overdue} no longer overdue</span>}
            </div>
          )}

          {res.sample?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                {done ? "Applied" : "Sample"} (first {res.sample.length}):
              </div>
              {res.sample.map((c: any) => (
                <div key={c.id} className="muted" style={{ fontSize: 12.5 }}>
                  {c.student} · {c.month} · {c.from || "no date"} → <b style={{ color: "var(--text)" }}>{c.to}</b>
                  {c.was !== c.status ? ` (${c.was} → ${c.status})` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
