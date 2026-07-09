"use client";
import { useEffect, useState } from "react";
import { sa } from "@/lib/saclient";
import Pager, { usePager } from "@/components/Pager";

export default function Academies() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const load = () => sa.listAcademies().then(setItems).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  const patch = async (id: string, data: any) => {
    setErr("");
    try { await sa.updateAcademy(id, data); load(); } catch (e: any) { setErr(e.message); }
  };
  const del = async (a: any) => {
    if (!confirm(`Permanently delete "${a.name}" and ALL its data (students, fees, staff)? This cannot be undone.`)) return;
    try { await sa.deleteAcademy(a.id); load(); } catch (e: any) { setErr(e.message); }
  };

  const filtered = items.filter(a =>
    !q || a.name.toLowerCase().includes(q.toLowerCase()) || (a.owner_email || "").toLowerCase().includes(q.toLowerCase()));
  const { page, setPage, totalPages, start, end } = usePager(filtered.length);
  const PLAN_LABELS: Record<string, string> = { free: "Free", basic: "Basic", pro: "Pro", premium: "Pro", enterprise: "Enterprise" };
  const today = new Date().toISOString().slice(0, 10);
  const planCode = (a: any) => String(a.subscription_plan || "free").toLowerCase();
  const isPaid = (a: any) => ["basic", "pro", "premium", "enterprise"].includes(planCode(a));
  const isExpired = (a: any) => isPaid(a) && a.subscription_expires && a.subscription_expires < today;

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input placeholder="Search by name or owner email…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 340 }} />
      </div>
      {err && <div className="err">{err}</div>}
      {filtered.slice(start, end).map(a => (
        <div className="list-item" key={a.id}>
          <div>
            <div>
              <b>{a.name}</b>{" "}
              <span className={`badge ${isPaid(a) && !isExpired(a) ? "active" : ""}`}>{PLAN_LABELS[planCode(a)] || "Free"}</span>{" "}
              {isExpired(a) && <span className="badge overdue">expired</span>}{" "}
              {a.status === "suspended" && <span className="badge overdue">suspended</span>}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {a.owner_name} · {a.owner_email} · {a.counts.branches} branches · {a.counts.trainers} trainers · {a.counts.students} students
            </div>
            {isPaid(a) && a.subscription_started && a.subscription_expires && (
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                Subscribed: {a.subscription_started} → {a.subscription_expires}
              </div>
            )}
          </div>
          <div className="row">
            <button className="secondary" onClick={() => patch(a.id, { subscription_plan: isPaid(a) ? "free" : "pro" })}>
              {isPaid(a) ? "Set Free" : "Grant Pro"}
            </button>
            <button className="secondary" onClick={() => patch(a.id, { status: a.status === "suspended" ? "active" : "suspended" })}>
              {a.status === "suspended" ? "Reactivate" : "Suspend"}
            </button>
            <button className="danger" onClick={() => del(a)}>Delete</button>
          </div>
        </div>
      ))}
      {!filtered.length && <p className="muted">No academies found.</p>}
      <Pager page={page} setPage={setPage} totalPages={totalPages} />
    </div>
  );
}
