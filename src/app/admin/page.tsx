"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function Dashboard() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api.dashboard().then(setD).catch(e => setErr(e.message)); }, []);
  if (err) return <div className="err">{err}</div>;
  if (!d) return <div className="muted">Loading dashboard…</div>;
  const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");
  return (
    <div className="grid">
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <div className="stat"><div className="n">{d.total_students}</div><div className="l">Students</div></div>
        <div className="stat"><div className="n">{d.total_trainers}</div><div className="l">Trainers</div></div>
        <div className="stat"><div className="n">{d.total_branches}</div><div className="l">Branches</div></div>
        <div className="stat"><div className="n">{d.attendance_rate_today}%</div><div className="l">Attendance today</div></div>
        <div className="stat"><div className="n">{d.classes_today}</div><div className="l">Classes today</div></div>
        <div className="stat"><div className="n">{inr(d.fee_collected)}</div><div className="l">Collected</div></div>
        <div className="stat"><div className="n">{inr(d.fee_pending)}</div><div className="l">Pending ({d.pending_count})</div></div>
        <div className="stat"><div className="n">{inr(d.monthly_revenue)}</div><div className="l">This month</div></div>
      </div>

      <div className="card">
        <b>7-day attendance trend</b>
        <div className="row" style={{ alignItems: "flex-end", height: 120, marginTop: 16 }}>
          {d.attendance_trend.map((t: any) => {
            const pct = t.total ? (t.present / t.total) * 100 : 0;
            return (
              <div key={t.date} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 90, display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", height: `${pct}%`, background: "var(--accent2)", borderRadius: 6, minHeight: 2 }} />
                </div>
                <div className="muted" style={{ fontSize: 11 }}>{t.date.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <b>Branch overview</b>
        <div style={{ marginTop: 12 }}>
          {d.branch_stats.map((b: any) => (
            <div className="list-item" key={b.branch_id}>
              <span>{b.name}</span>
              <span className="muted">{b.students} students · {b.trainers} trainers</span>
            </div>
          ))}
          {!d.branch_stats.length && <p className="muted">No branches yet.</p>}
        </div>
      </div>
    </div>
  );
}
