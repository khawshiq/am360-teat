"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Announcements from "@/components/Announcements";
import StatTile from "@/components/StatTile";

export default function Dashboard() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api.dashboard().then(setD).catch(e => setErr(e.message)); }, []);
  if (err) return <div className="err">{err}</div>;
  if (!d) return <div className="muted">Loading dashboard…</div>;
  const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");
  const tiles = { gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" };

  // Attendance is a rate, so it gets a meter — and its colour is severity, not
  // identity. But 0% before anyone has marked the register is not a crisis, it is
  // silence: with nothing marked we show a dash and stay neutral rather than
  // painting the tile red every morning.
  const marked = d.marked_today > 0;
  const rate = d.attendance_rate_today;
  const attendanceTone = !marked ? "cyan" : rate >= 85 ? "good" : rate >= 60 ? "warn" : "crit";

  return (
    <div className="grid">
      <Announcements />

      <div>
        <div className="section-title" style={{ marginBottom: 10 }}>Academy</div>
        <div className="grid" style={tiles}>
          <StatTile tone="blue" icon="students" value={d.total_students} label="Students" />
          <StatTile tone="violet" icon="trainers" value={d.total_trainers} label="Trainers" />
          <StatTile tone="cyan" icon="branches" value={d.total_branches} label="Branches" />
          <StatTile tone="magenta" icon="classes" value={d.classes_today} label="Classes today" />
          <StatTile
            tone={attendanceTone}
            icon="attendance"
            value={marked ? `${rate}%` : "—"}
            label={marked ? `Attendance today (${d.present_today}/${d.marked_today})` : "Attendance today — not marked"}
            meter={marked ? rate : 0}
          />
        </div>
      </div>

      <div>
        <div className="section-title" style={{ marginBottom: 10 }}>Fees</div>
        {/* Collected and This month are the same metric over different windows —
            money in — so they share the "good" tone rather than inventing a hue. */}
        <div className="grid" style={tiles}>
          <StatTile tone="good" icon="collected" value={inr(d.fee_collected)} label="Collected (all time)" />
          <StatTile tone="good" icon="month" value={inr(d.monthly_revenue)} label="Collected this month" />
          <StatTile tone="warn" icon="pending" value={inr(d.fee_pending)} label={`Pending (${d.pending_count})`} />
          <StatTile tone="crit" icon="overdue" value={inr(d.fee_overdue)} label={`Overdue (${d.overdue_count})`}
                    alarm={d.overdue_count > 0} />
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <span className="section-title">7-day attendance</span>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>% of marked students present</div>
          </div>
        </div>
        {/* Fixed 0–100 scale: auto-scaling to the tallest bar would make a 4% day
            look like a full house. Single series, so no legend — the title says it. */}
        <div className="chart">
          <div className="chart-ceiling"><span>100%</span></div>
          {d.attendance_trend.map((t: any) => {
            const pct = t.total ? (t.present / t.total) * 100 : 0;
            const shown = Math.round(pct);
            return (
              <div key={t.date} className="chart-col"
                   title={t.total ? `${t.date}: ${shown}% present (${t.present}/${t.total})` : `${t.date}: not marked`}>
                <div className="chart-track">
                  {t.total > 0 && <span className="chart-v">{shown}%</span>}
                  <div className="chart-bar" style={{ height: `${pct}%` }} />
                </div>
                <div className="chart-x">{t.date.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <span className="section-title">Branch overview</span>
        </div>
        {d.branch_stats.map((b: any) => (
          <div className="list-item" key={b.branch_id}>
            <span style={{ fontWeight: 500 }}>{b.name}</span>
            <span className="muted" style={{ fontSize: 13 }}>{b.students} students · {b.trainers} trainers</span>
          </div>
        ))}
        {!d.branch_stats.length && <p className="empty">No branches yet.</p>}
      </div>
    </div>
  );
}
