"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Announcements from "@/components/Announcements";
import StatTile from "@/components/StatTile";
import Modal from "@/components/Modal";
import Pager, { usePager } from "@/components/Pager";

type Item = { id: string; title: string; subtitle: string; value: string; tone?: string };

export default function Dashboard() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api.dashboard().then(setD).catch(e => setErr(e.message)); }, []);

  // The drill-down. A tile is a button; clicking it asks the server which rows are
  // behind the number and shows them. Loaded on demand — the dashboard stays one
  // request, and nobody pays for a list they never open.
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ title: string; items: Item[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailErr, setDetailErr] = useState("");

  const drill = async (metric: string) => {
    setOpen(metric); setDetail(null); setDetailErr(""); setBusy(true);
    try { setDetail(await api.breakdown(metric)); }
    catch (e: any) { setDetailErr(e.message); }
    finally { setBusy(false); }
  };
  const close = () => { setOpen(null); setDetail(null); setDetailErr(""); };

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
          <StatTile tone="blue" icon="students" value={d.total_students} label="Students" onClick={() => drill("students")} />
          <StatTile tone="violet" icon="trainers" value={d.total_trainers} label="Trainers" onClick={() => drill("trainers")} />
          <StatTile tone="cyan" icon="branches" value={d.total_branches} label="Branches" onClick={() => drill("branches")} />
          <StatTile tone="magenta" icon="classes" value={d.classes_today} label="Classes today" onClick={() => drill("classes")} />
          <StatTile
            tone={attendanceTone}
            icon="attendance"
            value={marked ? `${rate}%` : "—"}
            label={marked ? `Attendance today (${d.present_today}/${d.marked_today})` : "Attendance today — not marked"}
            meter={marked ? rate : 0}
            onClick={() => drill("attendance")}
          />
        </div>
      </div>

      <div>
        <div className="section-title" style={{ marginBottom: 10 }}>Fees</div>
        {/* Collected and This month are the same metric over different windows —
            money in — so they share the "good" tone rather than inventing a hue. */}
        <div className="grid" style={tiles}>
          <StatTile tone="good" icon="collected" value={inr(d.fee_collected)} label="Collected (all time)" onClick={() => drill("collected")} />
          <StatTile tone="good" icon="month" value={inr(d.monthly_revenue)} label="Collected this month" onClick={() => drill("month")} />
          <StatTile tone="warn" icon="pending" value={inr(d.fee_pending)} label={`Pending (${d.pending_count})`} onClick={() => drill("pending")} />
          <StatTile tone="crit" icon="overdue" value={inr(d.fee_overdue)} label={`Overdue (${d.overdue_count})`}
                    alarm={d.overdue_count > 0} onClick={() => drill("overdue")} />
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

      {open && (
        <Modal title={detail?.title || "Details"} onClose={close}>
          {busy && <p className="muted">Loading…</p>}
          {detailErr && <div className="err">{detailErr}</div>}
          {detail && <DetailList items={detail.items} />}
        </Modal>
      )}
    </div>
  );
}

// The rows behind a tile. Paged, because "Students" on a real academy is not a list
// you scroll — it is a list you page. Same 20/page as everywhere else in the app.
function DetailList({ items }: { items: Item[] }) {
  const p = usePager(items.length);
  if (!items.length) return <p className="empty">Nothing here.</p>;
  return (
    <>
      {items.slice(p.start, p.end).map(it => (
        <div className="list-item" key={it.id}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 500 }}>{it.title}</div>
            {it.subtitle && <div className="muted" style={{ fontSize: 12.5 }}>{it.subtitle}</div>}
          </div>
          {it.value && (
            it.tone
              // A tone means the value IS a status (present/late/absent, overdue money),
              // so it wears a badge — colour plus the word, never colour alone.
              ? <span className={`badge ${it.tone === "good" ? "paid" : it.tone === "warn" ? "pending" : "overdue"}`}
                      style={{ textTransform: "capitalize" }}>{it.value}</span>
              : <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>{it.value}</span>
          )}
        </div>
      ))}
      <Pager page={p.page} setPage={p.setPage} totalPages={p.totalPages} />
    </>
  );
}
