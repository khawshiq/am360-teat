"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Pager from "@/components/Pager";

const PAGE_SIZE = 50;

export default function AuditLog() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => { api.listAudit(page * PAGE_SIZE, PAGE_SIZE).then(setD).catch(e => setErr(e.message)); }, [page]);
  if (err) return <div className="err">{err}</div>;
  if (!d) return <div className="muted">Loading…</div>;
  const totalPages = Math.max(1, Math.ceil(d.total / PAGE_SIZE));
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
      <Pager page={page} setPage={setPage} totalPages={totalPages} />
    </div>
  );
}
