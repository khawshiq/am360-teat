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
  const rawPlan = (a: any) => String(a.subscription_plan || "free").toLowerCase();
  const planCode = (a: any) => (rawPlan(a) === "premium" ? "pro" : rawPlan(a)); // "premium" is a legacy alias
  const isPaid = (a: any) => ["basic", "pro", "enterprise"].includes(planCode(a));
  const isExpired = (a: any) => isPaid(a) && a.subscription_expires && a.subscription_expires < today;
  const isPermanent = (a: any) => isPaid(a) && !a.subscription_expires;

  // A Super Admin grant has no end date, so the plan never lapses back to Free.
  const grant = (a: any, code: string) => {
    if (code === planCode(a)) return;
    const paid = code !== "free";
    if (!confirm(paid
      ? `Grant "${a.name}" a permanent ${PLAN_LABELS[code]} plan (no expiry)?`
      : `Move "${a.name}" back to the Free plan and its limits?`)) return;
    patch(a.id, {
      subscription_plan: code,
      subscription_status: "active",
      subscription_started: paid ? (a.subscription_started || today) : null,
      subscription_expires: null,
    });
  };

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
              {isPermanent(a) && <span className="badge active">permanent</span>}{" "}
              {isExpired(a) && <span className="badge overdue">expired</span>}{" "}
              {a.status === "suspended" && <span className="badge overdue">suspended</span>}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {a.owner_name} · {a.owner_email} · {a.counts.branches} branches · {a.counts.trainers} trainers · {a.counts.students} students
            </div>
            {isPaid(a) && a.subscription_started && (
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                Subscribed: {a.subscription_started} → {a.subscription_expires || "no expiry"}
              </div>
            )}
          </div>
          <div className="row">
            <select value={planCode(a)} onChange={e => grant(a, e.target.value)} style={{ maxWidth: 150 }}>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
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
