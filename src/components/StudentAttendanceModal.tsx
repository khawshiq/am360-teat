"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Modal from "./Modal";
import { fmtDay, fmtMonth } from "@/lib/date";

// One student's attendance for one month, opened from their row. Month-steppable, because
// "how was he last month" is the immediate follow-up question and making the admin close
// the dialog to ask it would be silly.

const STATUS_COLOR: Record<string, string> = {
  present: "var(--ok)", absent: "var(--danger)", late: "var(--warn)",
};

const shiftMonth = (m: string, n: number) => {
  const [y, mo] = m.split("-").map(Number);
  const t = y * 12 + (mo - 1) + n;
  const yy = Math.floor(t / 12);
  return `${String(yy).padStart(4, "0")}-${String(t - yy * 12 + 1).padStart(2, "0")}`;
};

export default function StudentAttendanceModal({
  student, onClose,
}: { student: { id: string; name: string }; onClose: () => void }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let live = true;
    setBusy(true); setErr("");
    api.studentAttendance(student.id, month)
      .then(d => { if (live) setData(d); })
      .catch(e => { if (live) setErr(e.message); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [student.id, month]);

  return (
    <Modal title={`Attendance — ${student.name}`} onClose={onClose}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <button className="secondary" onClick={() => setMonth(m => shiftMonth(m, -1))} style={{ padding: "4px 12px", minHeight: 0 }}>‹ Prev</button>
        <b>{fmtMonth(month)}</b>
        {/* Never past the current month — there is no attendance in the future, and an
            empty "next month" screen reads as a bug rather than as an empty month. */}
        <button className="secondary" onClick={() => setMonth(m => shiftMonth(m, 1))}
                disabled={month >= thisMonth} style={{ padding: "4px 12px", minHeight: 0 }}>Next ›</button>
      </div>

      {err && <div className="err">{err}</div>}
      {busy && !data && <p className="muted">Loading…</p>}

      {data && !busy && (
        <>
          {data.marked === 0 ? (
            <p className="empty">The register was not marked for this student in {fmtMonth(month)}.</p>
          ) : (
            <>
              {/* The headline number answers the question that was asked — "his total
                  attendance in that month". Late counts as attended: he was there. */}
              <div className="card" style={{ background: "var(--surface-2)", padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>
                  {data.attended} <span className="muted" style={{ fontSize: 16, fontWeight: 500 }}>of {data.marked} classes</span>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {data.rate}% attendance · out of days the register was marked, not calendar days
                </div>
                <div className="row" style={{ gap: 14, marginTop: 10, flexWrap: "wrap" }}>
                  {([["present", data.present], ["late", data.late], ["absent", data.absent]] as const).map(([k, v]) => (
                    <span key={k} style={{ fontSize: 13 }}>
                      <b style={{ color: STATUS_COLOR[k] }}>{v}</b>{" "}
                      <span className="muted" style={{ textTransform: "capitalize" }}>{k}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {data.days.map((d: any) => (
                  <div className="list-item" key={d.date} style={{ padding: "7px 0" }}>
                    <span style={{ fontSize: 13.5 }}>{fmtDay(d.date)}</span>
                    <span className={`badge ${d.status === "present" ? "paid" : d.status === "late" ? "pending" : "overdue"}`}
                          style={{ textTransform: "capitalize" }}>{d.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
