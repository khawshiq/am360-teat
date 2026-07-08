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
  const isPremium = (a: any) => ["premium", "pro"].includes(a.subscription_plan);

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
              <span className="badge">{isPremium(a) ? "Premium" : "Free"}</span>{" "}
              {a.status === "suspended" && <span className="badge" style={{ color: "var(--danger)" }}>suspended</span>}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {a.owner_name} · {a.owner_email} · {a.counts.branches} branches · {a.counts.trainers} trainers · {a.counts.students} students
            </div>
          </div>
          <div className="row">
            <button className="secondary" onClick={() => patch(a.id, { subscription_plan: isPremium(a) ? "free" : "premium" })}>
              {isPremium(a) ? "Downgrade" : "Make Premium"}
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
