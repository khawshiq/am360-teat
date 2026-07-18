"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import Pager from "@/components/Pager";
import WhatsAppMark from "@/components/WhatsAppMark";

const PAGE_SIZE = 20;
const RECIPIENT_LABELS: Record<string, string> = {
  PARENTS: "Parents", STUDENTS: "Students", BOTH: "Both",
};
const STATUS_BADGE: Record<string, string> = {
  completed: "active", partial: "pending", failed: "overdue",
};

export default function NotificationHistory() {
  const [d, setD] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.listNotificationHistory(page * PAGE_SIZE, PAGE_SIZE).then(setD).catch(e => setErr(e.message));
  }, [page]);

  const totalPages = d ? Math.max(1, Math.ceil(d.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <WhatsAppMark size={28} />
          <div className="title" style={{ marginBottom: 0 }}>WhatsApp history {d && <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({d.total})</span>}</div>
        </div>
        <Link href="/admin/notifications"><button type="button" className="secondary">Send a message</button></Link>
      </div>

      {err && <div className="err">{err}</div>}
      {!d && !err && <div className="muted">Loading…</div>}

      {d?.items.map((n: any) => (
        <div className="list-item" key={n.id}>
          <div>
            <div><b>{n.branch_name}</b> <span className="muted" style={{ fontSize: 13 }}>· {RECIPIENT_LABELS[n.recipient_type] || n.recipient_type}</span></div>
            <div className="muted" style={{ fontSize: 13 }}>{n.message}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{n.created_by} · {n.created_at.replace("T", " ").slice(0, 16)}</div>
          </div>
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <span className="muted" style={{ fontSize: 13 }}>{n.total_recipients} sent</span>
            <span style={{ color: "var(--ok)", fontSize: 13 }}>{n.success_count} ok</span>
            {n.failed_count > 0 && <span style={{ color: "var(--danger)", fontSize: 13 }}>{n.failed_count} failed</span>}
            <span className={`badge ${STATUS_BADGE[n.status] || ""}`}>{n.status}</span>
          </div>
        </div>
      ))}
      {d && !d.items.length && <p className="muted">No WhatsApp messages sent yet.</p>}

      <Pager page={page} setPage={setPage} totalPages={totalPages} />
    </div>
  );
}
