"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function AuditLog() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api.listAudit(0, 100).then(setD).catch(e => setErr(e.message)); }, []);
  if (err) return <div className="err">{err}</div>;
  if (!d) return <div className="muted">Loading…</div>;
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Audit log <span className="muted" style={{ fontSize: 14 }}>({d.total})</span></h3>
      {d.items.map((a: any) => (
        <div className="list-item" key={a.id}>
          <div><b>{a.action}</b> <span className="muted" style={{ fontSize: 13 }}>· {a.entity}</span>
            <div className="muted" style={{ fontSize: 13 }}>{a.actor_name} · {a.created_at.replace("T", " ").slice(0, 16)}</div></div>
        </div>
      ))}
      {!d.items.length && <p className="muted">No activity yet.</p>}
    </div>
  );
}
