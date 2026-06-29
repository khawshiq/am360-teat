"use client";
import { useEffect, useMemo, useState } from "react";
import { api, uploadImage } from "@/lib/client";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type Status = "present" | "absent" | "late";
const cycle = (s?: Status): Status => (s === "present" ? "absent" : s === "absent" ? "late" : "present");
const STATUS_COLOR: Record<Status, string> = { present: "var(--ok)", absent: "var(--danger)", late: "var(--warn)" };
const todayStr = () => new Date().toISOString().slice(0, 10);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}

export default function BranchWorkspace({ branchId, isAdmin }: { branchId: string; isAdmin: boolean }) {
  const TABS = ["students", "attendance", "fees", "schedule"] as const;
  const [tab, setTab] = useState<(typeof TABS)[number]>("attendance");
  const [branch, setBranch] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Status>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const today = todayStr();

  const load = async () => {
    setErr("");
    try {
      const [branches, ss, att, sess, sch] = await Promise.all([
        api.listBranches(), api.listStudents(branchId),
        api.getAttendance(branchId, today), api.getSession(branchId, today),
        api.listSchedules({ branch_id: branchId }),
      ]);
      setBranch(branches.find((b: any) => b.id === branchId));
      setStudents(ss); setSchedules(sch);
      const m: Record<string, Status> = {}; for (const r of att) m[r.student_id] = r.status; setAttendance(m);
      setPhotos(sess?.photos || []);
      if (isAdmin) {
        const [fs, trs] = await Promise.all([api.listFees(branchId), api.listTrainers()]);
        setFees(fs); setTrainers(trs);
      } else { setFees(await api.listFees(branchId).catch(() => [])); }
    } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [branchId]);

  // ---- students ----
  const [sForm, setSForm] = useState({ name: "", phone: "", monthly_fee: "" });
  const addStudent = async () => {
    try {
      await api.createStudent({ name: sForm.name, phone: sForm.phone, branch_id: branchId, monthly_fee: parseFloat(sForm.monthly_fee) || 0 });
      setSForm({ name: "", phone: "", monthly_fee: "" }); load();
    } catch (e: any) { setErr(e.message); }
  };

  // ---- attendance ----
  const toggle = (id: string) => setAttendance(p => ({ ...p, [id]: cycle(p[id]) }));
  const markAll = () => { const m: Record<string, Status> = {}; for (const s of students) m[s.id] = "present"; setAttendance(m); };
  const addPhoto = async (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (photos.length >= 2) { setErr("Maximum 2 photos per class."); return; }
    try { const url = await uploadImage(f, "am360/attendance"); setPhotos(p => [...p, url]); }
    catch (e: any) { setErr("Photo upload failed: " + e.message); }
  };
  const save = async () => {
    setMsg(""); setErr("");
    try {
      const records = students.map(s => ({ student_id: s.id, status: attendance[s.id] || "absent" }));
      await api.markAttendance({ branch_id: branchId, date: today, records, photos });
      setMsg("Attendance & photos saved.");
    } catch (e: any) { setErr(e.message); }
  };

  // ---- fees ----
  const feeByStudent = useMemo(() => {
    const m: Record<string, any> = {}; for (const f of fees) if (f.month === today.slice(0, 7)) m[f.student_id] = f; return m;
  }, [fees, today]);
  const createFee = async (s: any) => {
    try { await api.createFee({ student_id: s.id, amount: s.monthly_fee || 0, month: today.slice(0, 7), status: "pending" }); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const payFee = async (f: any) => { await api.payFee(f.id, { amount: f.amount, method: "cash", paid_date: today }); load(); };

  // ---- schedule ----
  const [scForm, setScForm] = useState<any>({ title: "", trainer_id: "", day_of_week: 0, start_time: "17:00", end_time: "18:00" });
  const addSchedule = async () => {
    try {
      await api.createSchedule({ branch_id: branchId, title: scForm.title, trainer_id: scForm.trainer_id || null,
        day_of_week: Number(scForm.day_of_week), start_time: scForm.start_time, end_time: scForm.end_time });
      setScForm({ ...scForm, title: "" }); load();
    } catch (e: any) { setErr(e.message); }
  };
  const delSchedule = async (id: string) => { if (confirm("Remove class?")) { await api.deleteSchedule(id); load(); } };

  return (
    <div>
      <h3 style={{ margin: "4px 0" }}>{branch?.name || "Branch"}</h3>
      <p className="muted" style={{ marginTop: 0 }}>{students.length} students · {today}</p>
      <nav className="nav">
        {TABS.map(t => <a key={t} className={tab === t ? "active" : ""} onClick={() => { setMsg(""); setErr(""); setTab(t); }} style={{ cursor: "pointer", textTransform: "capitalize" }}>{t}</a>)}
      </nav>
      {err && <div className="err">{err}</div>}
      {msg && <div style={{ color: "var(--ok)", fontSize: 14, marginBottom: 10 }}>{msg}</div>}

      {tab === "students" && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row">
              <input placeholder="Name" value={sForm.name} onChange={e => setSForm({ ...sForm, name: e.target.value })} style={{ flex: 2 }} />
              <input placeholder="Phone" value={sForm.phone} onChange={e => setSForm({ ...sForm, phone: e.target.value })} style={{ flex: 1 }} />
              <input placeholder="₹/mo" value={sForm.monthly_fee} onChange={e => setSForm({ ...sForm, monthly_fee: e.target.value })} style={{ width: 90 }} />
              <button onClick={addStudent} disabled={!sForm.name}>Add</button>
            </div>
          </div>
          {students.map(s => (
            <div className="list-item" key={s.id}>
              <div><b>{s.name}</b><div className="muted" style={{ fontSize: 13 }}>{s.phone || "—"} · ₹{s.monthly_fee}/mo</div></div>
              {isAdmin && <button className="danger" onClick={async () => { if (confirm("Delete student?")) { await api.deleteStudent(s.id); load(); } }}>Delete</button>}
            </div>
          ))}
          {!students.length && <p className="muted">No students yet.</p>}
        </div>
      )}

      {tab === "attendance" && (
        <div>
          <div className="row" style={{ marginBottom: 12 }}>
            <button className="secondary" onClick={markAll}>Mark all present</button>
            <button onClick={save}>Save</button>
          </div>
          {students.map(s => {
            const st = attendance[s.id];
            return (
              <div className="list-item" key={s.id} onClick={() => toggle(s.id)} style={{ cursor: "pointer" }}>
                <b>{s.name}</b>
                <span className="badge" style={{ color: st ? STATUS_COLOR[st] : "var(--muted)", textTransform: "capitalize" }}>{st || "tap to mark"}</span>
              </div>
            );
          })}
          {!students.length && <p className="muted">Add students first.</p>}
          <div className="card" style={{ marginTop: 14 }}>
            <b>Class photos (max 2)</b>
            <div className="row" style={{ marginTop: 10 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={p} alt="" style={{ width: 90, height: 90, borderRadius: 10, objectFit: "cover" }} />
                  <button className="danger" style={{ padding: "2px 8px", marginTop: 4 }} onClick={() => setPhotos(ph => ph.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              {photos.length < 2 && <input type="file" accept="image/*" onChange={addPhoto} />}
            </div>
          </div>
        </div>
      )}

      {tab === "fees" && (
        <div>
          {students.map(s => {
            const f = feeByStudent[s.id];
            return (
              <div className="list-item" key={s.id}>
                <div><b>{s.name}</b><div className="muted" style={{ fontSize: 13 }}>₹{s.monthly_fee}/mo · {today.slice(0, 7)}</div></div>
                <div className="row">
                  {f ? <span className={`badge ${f.status}`} style={{ textTransform: "capitalize" }}>{f.status}</span>
                    : <span className="muted" style={{ fontSize: 13 }}>no record</span>}
                  {isAdmin && !f && <button className="secondary" onClick={() => createFee(s)}>Create</button>}
                  {isAdmin && f && f.status !== "paid" && <button onClick={() => payFee(f)}>Mark paid</button>}
                </div>
              </div>
            );
          })}
          {!students.length && <p className="muted">No students.</p>}
          {!isAdmin && <p className="muted" style={{ fontSize: 13 }}>Fees are managed by admins.</p>}
        </div>
      )}

      {tab === "schedule" && (
        <div>
          {isAdmin && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="row">
                <input placeholder="Class title" value={scForm.title} onChange={e => setScForm({ ...scForm, title: e.target.value })} style={{ flex: 2 }} />
                <select value={scForm.trainer_id} onChange={e => setScForm({ ...scForm, trainer_id: e.target.value })} style={{ flex: 1 }}>
                  <option value="">No trainer</option>
                  {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <select value={scForm.day_of_week} onChange={e => setScForm({ ...scForm, day_of_week: e.target.value })}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input type="time" value={scForm.start_time} onChange={e => setScForm({ ...scForm, start_time: e.target.value })} style={{ width: 120 }} />
                <input type="time" value={scForm.end_time} onChange={e => setScForm({ ...scForm, end_time: e.target.value })} style={{ width: 120 }} />
                <button onClick={addSchedule} disabled={!scForm.title}>Add</button>
              </div>
            </div>
          )}
          {schedules.map(s => (
            <div className="list-item" key={s.id}>
              <div><b>{s.title}</b><div className="muted" style={{ fontSize: 13 }}>{DAYS[s.day_of_week]} · {s.start_time}–{s.end_time}{s.trainer_id ? ` · ${trainers.find(t => t.id === s.trainer_id)?.name || "trainer"}` : ""}</div></div>
              {isAdmin && <button className="danger" onClick={() => delSchedule(s.id)}>Delete</button>}
            </div>
          ))}
          {!schedules.length && <p className="muted">No classes scheduled.</p>}
        </div>
      )}
    </div>
  );
}
