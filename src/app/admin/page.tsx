"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useAuth } from "@/context/auth";
import { fmtDay } from "@/lib/date";
import Announcements from "@/components/Announcements";
import StatTile, { Tone } from "@/components/StatTile";
import Modal from "@/components/Modal";
import Pager, { usePager } from "@/components/Pager";

type Item = { id: string; title: string; subtitle: string; value: string; tone?: string };

// The identity hues only — never a status hue. A branch is a thing, not a state, and
// a red branch chip would read as "this branch has a problem".
const BRANCH_TONES = ["t-blue", "t-violet", "t-cyan", "t-magenta"];

export default function Dashboard() {
  const { user } = useAuth();
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
  const tiles = { gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))" };

  // Local, not toISOString(): that is UTC, and it would put yesterday's date on the
  // dashboard for anyone east of Greenwich for part of the day — including here.
  const n = new Date();
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  const firstName = (user?.name || "").split(" ")[0];

  // Attendance is a rate, so it gets a meter — and its colour is severity, not
  // identity: a rate is a state. Every other tile in the row has a fixed hue.
  // But 0% before anyone has marked the register is not a crisis, it is silence:
  // with nothing marked we go slate and show a dash, rather than painting the tile
  // red every morning before the trainers arrive.
  const marked = d.marked_today > 0;
  const rate = d.attendance_rate_today;
  const attendanceTone: Tone = !marked ? "slate" : rate >= 85 ? "good" : rate >= 40 ? "warn" : "crit";

  return (
    <div className="grid">
      <div className="welcome">
        <div>
          <h1>Welcome back{firstName ? <>, <em>{firstName}</em></> : ""}!</h1>
          <p>Here&rsquo;s what&rsquo;s happening in your academy today.</p>
        </div>
        <span className="date-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          {fmtDay(today)}
        </span>
      </div>

      <Announcements />

      {/* A permanent box, on purpose — it is here every day so nobody has to wonder whether
          the feature is running. Shown to everyone on every plan (knowing it is someone's
          birthday costs nothing); the *sending* of a wish is a separate, opt-in, Pro-gated
          thing, so the subtitle says which of the two happened rather than implying a wish
          went out. Empty days get a one-line calm state, not a hidden card. */}
      {(() => {
        const list = d.birthdays_today || [];
        const upcoming = d.birthdays_upcoming || [];
        const has = list.length > 0;
        return (
          <div className="card">
            <div className="section-head">
              <div>
                <span className="section-title">🎂 Student birthdays</span>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {!has
                    ? "No student has a birthday today."
                    : d.birthday_wishes_sent > 0
                      ? `${d.birthday_wishes_sent} WhatsApp wish${d.birthday_wishes_sent === 1 ? "" : "es"} sent automatically.`
                      : "Automatic wishes are off — turn them on under Notifications."}
                </div>
              </div>
              {has && <span className="badge brand">{list.length} today</span>}
            </div>

            {list.map((s: any) => (
              <div className="list-item" key={s.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span className="row-ico t-magenta" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                         strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 21h16v-7H4z" /><path d="M4 14a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2" />
                      <path d="M12 12V8" /><path d="M12 5.5V5" />
                    </svg>
                  </span>
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                </div>
                <span className="row-stat">{s.dob ? `born ${fmtDay(s.dob)}` : ""}</span>
              </div>
            ))}

            {/* The next 7 days, so the academy can prepare — a card, a mention in class —
                rather than finding out the morning of. Quieter than today's list: no cake
                chip, and the lead time ("in 3 days") is the useful number here, not the
                birth year. */}
            {upcoming.length > 0 && (
              <>
                <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, margin: `${has ? 14 : 6}px 0 2px` }}>
                  Coming up this week
                </div>
                {upcoming.map((s: any) => (
                  <div className="list-item" key={s.id}>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span className="row-stat">
                      {fmtDay(s.date)} · <b>{s.in_days === 1 ? "tomorrow" : `in ${s.in_days} days`}</b>
                    </span>
                  </div>
                ))}
              </>
            )}

            {!has && upcoming.length === 0 && (
              <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>No birthdays in the next 7 days.</p>
            )}
          </div>
        );
      })()}

      <div>
        <div className="section-title" style={{ marginBottom: 10 }}>Academy overview</div>
        <div className="grid" style={tiles}>
          <StatTile tone="blue" icon="students" value={d.total_students} label="Students" onClick={() => drill("students")} />
          <StatTile tone="violet" icon="trainers" value={d.total_trainers} label="Trainers" onClick={() => drill("trainers")} />
          <StatTile tone="cyan" icon="branches" value={d.total_branches} label="Branches" onClick={() => drill("branches")} />
          <StatTile tone="magenta" icon="classes" value={d.classes_today} label="Classes today"
                    sub={d.classes_today ? undefined : "Nothing scheduled"} onClick={() => drill("classes")} />
          <StatTile
            tone={attendanceTone}
            icon="attendance"
            value={marked ? `${rate}%` : "—"}
            label="Attendance today"
            sub={marked ? `${d.present_today} of ${d.marked_today} present` : "Register not marked yet"}
            meter={marked ? rate : 0}
            onClick={() => drill("attendance")}
          />
        </div>
      </div>

      <div>
        <div className="section-title" style={{ marginBottom: 10 }}>Fees overview</div>
        {/* White cards, on purpose. The row above is already five saturated tiles;
            five more and the eye has nowhere to land. Here the tone rides the icon
            chip, the value and the sparkline instead.

            Collected and This month are the same metric over different windows —
            money in — so they share the "good" tone rather than inventing a hue. */}
        <div className="grid" style={tiles}>
          <StatTile wave tone="good" icon="collected" value={inr(d.fee_collected)} label="Collected (all time)" onClick={() => drill("collected")} />
          <StatTile wave tone="good" icon="month" value={inr(d.monthly_revenue)} label="Collected this month" onClick={() => drill("month")} />
          <StatTile wave tone="warn" icon="pending" value={inr(d.fee_pending)} label={`Pending (${d.pending_count})`} onClick={() => drill("pending")} />
          <StatTile wave tone="crit" icon="overdue" value={inr(d.fee_overdue)} label={`Overdue (${d.overdue_count})`} onClick={() => drill("overdue")} />
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
        <div className="chart-wrap">
          <div className="chart-y" aria-hidden="true">
            <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
          </div>
          <div className="chart">
            <div className="chart-grid" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            {d.attendance_trend.map((t: any) => {
              const pct = t.total ? (t.present / t.total) * 100 : 0;
              const shown = Math.round(pct);
              return (
                <div key={t.date} className="chart-col"
                     title={t.total ? `${fmtDay(t.date)}: ${shown}% present (${t.present}/${t.total})` : `${fmtDay(t.date)}: not marked`}>
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
      </div>

      <div className="card">
        <div className="section-head">
          <span className="section-title">Branch overview</span>
        </div>
        {d.branch_stats.map((b: any, i: number) => (
          <div className="list-item" key={b.branch_id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              {/* The chip's hue comes from the row's position, so a branch keeps the
                  same colour on every render. It is a name-tag, not a status. */}
              <span className={`row-ico ${BRANCH_TONES[i % BRANCH_TONES.length]}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M10 21v-6h4v6" />
                </svg>
              </span>
              <span style={{ fontWeight: 600 }}>{b.name}</span>
            </div>
            <span className="row-stat"><b>{b.students}</b> students · <b>{b.trainers}</b> trainers</span>
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
