"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useImageUpload } from "@/lib/useImageUpload";
import { cld } from "@/lib/cloudinary";
import Modal from "./Modal";
import Pager, { usePager } from "./Pager";
import ExportMenu from "./ExportMenu";
import RowMenu from "./RowMenu";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { upcomingDueDate } from "@/lib/fees";
import { fmtDay, fmtMonth } from "@/lib/date";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type Status = "present" | "absent" | "late";
const cycle = (s?: Status): Status => (s === "present" ? "absent" : s === "absent" ? "late" : "present");
const STATUS_COLOR: Record<Status, string> = { present: "var(--ok)", absent: "var(--danger)", late: "var(--warn)" };
const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyStudentForm = {
  name: "", phone: "", monthly_fee: "", parent_name: "", alt_mobile: "", email: "", address: "",
  dob: "", gender: "", admission_date: "", batch: "", course: "", photo_url: "",
  emergency_contact: "", medical_notes: "", notes: "", status: "active",
};

export default function BranchWorkspace({ branchId, isAdmin }: { branchId: string; isAdmin: boolean }) {
  const TABS = ["students", "attendance", "fees", "schedule"] as const;
  const [tab, setTab] = useState<(typeof TABS)[number]>("attendance");
  const [branch, setBranch] = useState<any>(null);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Status>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const today = todayStr();
  const [viewDate, setViewDate] = useState(today);
  const isToday = viewDate === today;
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);

  const load = async () => {
    setErr("");
    try {
      const [branches, ss, sch] = await Promise.all([
        api.listBranches(), api.listStudents(branchId, showInactiveStudents),
        api.listSchedules({ branch_id: branchId }),
      ]);
      setBranch(branches.find((b: any) => b.id === branchId));
      setAllBranches(branches);
      setStudents(ss); setSchedules(sch);
    } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [branchId, showInactiveStudents]);

  const loadFeesTrainers = async () => {
    try {
      const [fs, trs] = await Promise.all([
        api.listFees(branchId).catch(() => []),
        isAdmin ? api.listTrainers().catch(() => []) : Promise.resolve([]),
      ]);
      setFees(fs);
      if (isAdmin) setTrainers(trs);
    } catch { /* individual calls already fall back to [] above */ }
  };
  useEffect(() => { loadFeesTrainers(); /* eslint-disable-next-line */ }, [branchId, isAdmin]);

  const [attendanceDirty, setAttendanceDirty] = useState(false);
  const loadAttendance = async () => {
    try {
      const [att, sess] = await Promise.all([api.getAttendance(branchId, viewDate), api.getSession(branchId, viewDate)]);
      const m: Record<string, Status> = {}; for (const r of att) m[r.student_id] = r.status; setAttendance(m);
      setPhotos(sess?.photos || []);
      setAttendanceDirty(false);
    } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { loadAttendance(); /* eslint-disable-next-line */ }, [branchId, viewDate]);
  const changeViewDate = (newDate: string) => {
    if (isToday && attendanceDirty && !confirm("You have unsaved attendance changes for today. Discard them?")) return;
    setViewDate(newDate);
  };

  // ---- students ----
  const [sForm, setSForm] = useState<any>(emptyStudentForm);
  const [sModalOpen, setSModalOpen] = useState(false);
  const [sEditId, setSEditId] = useState<string | null>(null);
  const { uploading: sUploading, onFileChange: onStudentPhotoChange } = useImageUpload("am360/students");
  const openAddStudent = () => { setSEditId(null); setSForm(emptyStudentForm); setSModalOpen(true); };
  const openEditStudent = (s: any) => {
    setSEditId(s.id);
    setSForm({
      name: s.name || "", phone: s.phone || "", monthly_fee: String(s.monthly_fee ?? ""), parent_name: s.parent_name || "",
      alt_mobile: s.alt_mobile || "", email: s.email || "", address: s.address || "", dob: s.dob || "", gender: s.gender || "",
      admission_date: s.admission_date || "", batch: s.batch || "", course: s.course || "", photo_url: s.photo_url || "",
      emergency_contact: s.emergency_contact || "", medical_notes: s.medical_notes || "", notes: s.notes || "", status: s.status || "active",
    });
    setSModalOpen(true);
  };
  const onStudentPhoto = (e: any) => onStudentPhotoChange(e, url => setSForm((s: any) => ({ ...s, photo_url: url })), setErr);
  const saveStudent = async () => {
    try {
      const data: any = { ...sForm, monthly_fee: parseFloat(sForm.monthly_fee) || 0 };
      if (sEditId) await api.updateStudent(sEditId, data);
      else await api.createStudent({ ...data, branch_id: branchId });
      setSModalOpen(false); load();
    } catch (e: any) { setErr(e.message); }
  };
  const closeStudentModal = () => { setSModalOpen(false); setErr(""); };
  const toggleStudentStatus = async (s: any) => {
    try { await api.updateStudent(s.id, { status: s.status === "active" ? "inactive" : "active" }); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const [delTarget, setDelTarget] = useState<any>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState("");
  const openDeleteStudent = (s: any) => { setDelTarget(s); setDelErr(""); };
  const confirmDeleteStudent = async () => {
    setDelBusy(true); setDelErr("");
    try { await api.deleteStudent(delTarget.id); setDelTarget(null); load(); }
    catch (e: any) { setDelErr(e.message); }
    finally { setDelBusy(false); }
  };
  const [transferId, setTransferId] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const startTransfer = (s: any) => { setTransferId(s.id); setTransferTo(""); };
  const doTransfer = async () => {
    if (!transferTo) return;
    try { await api.transferStudent(transferId as string, transferTo); setTransferId(null); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const studentsPager = usePager(students.length);

  // ---- attendance ----
  const toggle = (id: string) => { if (isToday) { setAttendance(p => ({ ...p, [id]: cycle(p[id]) })); setAttendanceDirty(true); } };
  const markAll = () => { const m: Record<string, Status> = {}; for (const s of students) m[s.id] = "present"; setAttendance(m); setAttendanceDirty(true); };
  const { uploading: photoUploading, onFileChange: onClassPhotoChange } = useImageUpload("am360/attendance");
  const addPhoto = (e: any) => {
    if (photos.length >= 2) { setErr("Maximum 2 photos per class."); e.target.value = ""; return; }
    onClassPhotoChange(e, url => { setPhotos(p => [...p, url]); setAttendanceDirty(true); }, setErr);
  };
  const removePhoto = (i: number) => { setPhotos(ph => ph.filter((_, j) => j !== i)); setAttendanceDirty(true); };
  const save = async () => {
    setMsg(""); setErr("");
    try {
      const records = students.map(s => ({ student_id: s.id, status: attendance[s.id] || "absent" }));
      await api.markAttendance({ branch_id: branchId, date: today, records, photos });
      setMsg("Attendance & photos saved.");
      setAttendanceDirty(false);
    } catch (e: any) { setErr(e.message); }
  };

  // ---- fees ----
  const feeByStudent = useMemo(() => {
    const m: Record<string, any> = {}; for (const f of fees) if (f.month === today.slice(0, 7)) m[f.student_id] = f; return m;
  }, [fees, today]);

  // Payment history rolled up per student, across every month — not just the current one.
  // `last_paid` is their most recent payment. `next_due` is the earliest date they still
  // owe against; when they owe nothing it becomes their *upcoming* billing date, derived
  // from their admission day, so the answer is never a dead end like "nothing owed".
  const historyByStudent = useMemo(() => {
    const feesOf: Record<string, any[]> = {};
    for (const f of fees) (feesOf[f.student_id] ||= []).push(f);

    const m: Record<string, { last_paid: string | null; next_due: string | null; outstanding: number; upcoming: boolean }> = {};
    for (const s of students) {
      const fs = feesOf[s.id] || [];
      let last_paid: string | null = null, next_due: string | null = null, outstanding = 0;
      for (const f of fs) {
        for (const p of f.payments || [])
          if (p.paid_date && (!last_paid || p.paid_date > last_paid)) last_paid = p.paid_date;
        if (f.status !== "paid") {
          outstanding += (f.amount - f.paid_amount);
          if (f.due_date && (!next_due || f.due_date < next_due)) next_due = f.due_date;
        }
      }
      const owes = !!next_due;
      if (!owes) next_due = upcomingDueDate(s, fs.map(f => f.month), today);
      m[s.id] = { last_paid, next_due, outstanding, upcoming: !owes };
    }
    return m;
  }, [fees, students, today]);
  const createFee = async (s: any) => {
    try { await api.createFee({ student_id: s.id, amount: s.monthly_fee || 0, month: today.slice(0, 7) }); loadFeesTrainers(); }
    catch (e: any) { setErr(e.message); }
  };
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const openPay = (f: any) => { setPayTarget(f); setPayAmount(String(Math.max(0, f.amount - f.paid_amount))); setPayMethod("cash"); };
  const submitPay = async () => {
    try {
      await api.payFee(payTarget.id, { amount: parseFloat(payAmount) || 0, method: payMethod, paid_date: today });
      setPayTarget(null); loadFeesTrainers();
    } catch (e: any) { setErr(e.message); }
  };
  const closePayModal = () => { setPayTarget(null); setErr(""); };
  const feesPager = usePager(students.length);

  // ---- schedule ----
  const emptyScForm = { title: "", trainer_id: "", day_of_week: 0, start_time: "17:00", end_time: "18:00" };
  const [scForm, setScForm] = useState<any>(emptyScForm);
  const [scEditId, setScEditId] = useState<string | null>(null);
  const saveSchedule = async () => {
    try {
      const data = { branch_id: branchId, title: scForm.title, trainer_id: scForm.trainer_id || null,
        day_of_week: Number(scForm.day_of_week), start_time: scForm.start_time, end_time: scForm.end_time };
      if (scEditId) await api.updateSchedule(scEditId, data); else await api.createSchedule(data);
      setScForm(emptyScForm); setScEditId(null); load();
    } catch (e: any) { setErr(e.message); }
  };
  const editSchedule = (s: any) => { setScEditId(s.id); setScForm({ title: s.title, trainer_id: s.trainer_id || "", day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time }); };
  const cancelScheduleEdit = () => { setScEditId(null); setScForm(emptyScForm); };
  const [scDelTarget, setScDelTarget] = useState<any>(null);
  const [scDelBusy, setScDelBusy] = useState(false);
  const [scDelErr, setScDelErr] = useState("");
  const openDeleteSchedule = (s: any) => { setScDelTarget(s); setScDelErr(""); };
  const confirmDeleteSchedule = async () => {
    setScDelBusy(true); setScDelErr("");
    try { await api.deleteSchedule(scDelTarget.id); setScDelTarget(null); load(); }
    catch (e: any) { setScDelErr(e.message); }
    finally { setScDelBusy(false); }
  };
  const schedulePager = usePager(schedules.length);

  return (
    <div>
      <div className="title" style={{ marginBottom: 2 }}>{branch?.name || "Branch"}</div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>{students.length} students · {today}</p>
      <nav className="nav">
        {TABS.map(t => <a key={t} className={tab === t ? "active" : ""} onClick={() => { setMsg(""); setErr(""); setTab(t); }} style={{ cursor: "pointer", textTransform: "capitalize" }}>{t}</a>)}
      </nav>
      {err && !sModalOpen && !payTarget && <div className="err">{err}</div>}
      {msg && <div style={{ color: "var(--ok)", fontSize: 14, marginBottom: 10 }}>{msg}</div>}

      {tab === "students" && (
        <div>
          <div className="row" style={{ marginBottom: 14, justifyContent: "space-between" }}>
            <div className="row">
              <button onClick={openAddStudent}>Add student</button>
              <ExportMenu type="students" branchId={branchId} disabled={!students.length} />
            </div>
            <label className="row" style={{ fontSize: 13, gap: 6 }}>
              <input type="checkbox" checked={showInactiveStudents} onChange={e => setShowInactiveStudents(e.target.checked)} /> Show inactive
            </label>
          </div>
          {students.slice(studentsPager.start, studentsPager.end).map(s => (
            <div className="list-item" key={s.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <b>{s.name}</b> {s.status !== "active" && <span className="badge inactive">inactive</span>}
                  <div className="muted" style={{ fontSize: 13 }}>{s.phone || "—"} · ₹{s.monthly_fee}/mo{s.batch ? ` · ${s.batch}` : ""}{s.course ? ` · ${s.course}` : ""}</div>
                </div>
                {isAdmin && (
                  <RowMenu label={`Actions for ${s.name}`}>
                    {close => (
                      <>
                        <button className="menu-item" role="menuitem" onClick={() => { openEditStudent(s); close(); }}><span>Edit</span></button>
                        <button className="menu-item" role="menuitem" onClick={() => { startTransfer(s); close(); }}><span>Transfer</span></button>
                        <button className="menu-item" role="menuitem" onClick={() => { toggleStudentStatus(s); close(); }}>
                          <span>{s.status === "active" ? "Deactivate" : "Activate"}</span>
                        </button>
                        <button className="menu-item" role="menuitem" onClick={() => { openDeleteStudent(s); close(); }}>
                          <span style={{ color: "var(--danger)" }}>Delete</span>
                        </button>
                      </>
                    )}
                  </RowMenu>
                )}
              </div>
              {transferId === s.id && (
                <div className="row" style={{ marginTop: 8 }}>
                  <select value={transferTo} onChange={e => setTransferTo(e.target.value)} style={{ flex: 1 }}>
                    <option value="">Select destination branch…</option>
                    {allBranches.filter(b => b.id !== branchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <button onClick={doTransfer} disabled={!transferTo}>Move</button>
                  <button className="secondary" onClick={() => setTransferId(null)}>Cancel</button>
                </div>
              )}
            </div>
          ))}
          {!students.length && <p className="muted">No students yet.</p>}
          <Pager page={studentsPager.page} setPage={studentsPager.setPage} totalPages={studentsPager.totalPages} />

          {sModalOpen && (
            <Modal title={sEditId ? "Edit student" : "Add student"} onClose={closeStudentModal}>
              {sForm.photo_url && <img src={cld(sForm.photo_url, { w: 128, h: 128, crop: "fill", gravity: "auto" })} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", marginBottom: 10 }} />}
              <div className="field"><label>Photo {sUploading && <span className="muted">(uploading…)</span>}</label><input type="file" accept="image/*" onChange={onStudentPhoto} /></div>
              <div className="row">
                <div className="field" style={{ flex: 2 }}><label>Name</label><input value={sForm.name} onChange={e => setSForm({ ...sForm, name: e.target.value })} /></div>
                <div className="field" style={{ flex: 1 }}><label>₹/month</label><input value={sForm.monthly_fee} onChange={e => setSForm({ ...sForm, monthly_fee: e.target.value })} /></div>
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}><label>Phone</label><input value={sForm.phone} onChange={e => setSForm({ ...sForm, phone: e.target.value })} /></div>
                <div className="field" style={{ flex: 1 }}><label>Alt. mobile</label><input value={sForm.alt_mobile} onChange={e => setSForm({ ...sForm, alt_mobile: e.target.value })} /></div>
              </div>
              <div className="field"><label>Email</label><input value={sForm.email} onChange={e => setSForm({ ...sForm, email: e.target.value })} /></div>
              <div className="field"><label>Address</label><input value={sForm.address} onChange={e => setSForm({ ...sForm, address: e.target.value })} /></div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}><label>Parent/guardian name</label><input value={sForm.parent_name} onChange={e => setSForm({ ...sForm, parent_name: e.target.value })} /></div>
                <div className="field" style={{ flex: 1 }}><label>Emergency contact</label><input value={sForm.emergency_contact} onChange={e => setSForm({ ...sForm, emergency_contact: e.target.value })} /></div>
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}><label>Date of birth</label><input type="date" value={sForm.dob} onChange={e => setSForm({ ...sForm, dob: e.target.value })} /></div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Gender</label>
                  <select value={sForm.gender} onChange={e => setSForm({ ...sForm, gender: e.target.value })}>
                    <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}><label>Admission date</label><input type="date" value={sForm.admission_date} onChange={e => setSForm({ ...sForm, admission_date: e.target.value })} /></div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Status</label>
                  <select value={sForm.status} onChange={e => setSForm({ ...sForm, status: e.target.value })}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}><label>Batch</label><input value={sForm.batch} onChange={e => setSForm({ ...sForm, batch: e.target.value })} /></div>
                <div className="field" style={{ flex: 1 }}><label>Course</label><input value={sForm.course} onChange={e => setSForm({ ...sForm, course: e.target.value })} /></div>
              </div>
              <div className="field"><label>Medical notes</label><textarea rows={2} value={sForm.medical_notes} onChange={e => setSForm({ ...sForm, medical_notes: e.target.value })} /></div>
              <div className="field"><label>Notes</label><textarea rows={2} value={sForm.notes} onChange={e => setSForm({ ...sForm, notes: e.target.value })} /></div>
              {err && <div className="err">{err}</div>}
              <div className="row">
                <button onClick={saveStudent} disabled={!sForm.name}>{sEditId ? "Update" : "Add"}</button>
                <button className="secondary" onClick={closeStudentModal}>Cancel</button>
              </div>
            </Modal>
          )}

          {delTarget && (
            <ConfirmDeleteModal
              title="Delete student"
              message={<>This permanently deletes <b>{delTarget.name}</b> along with their attendance and fee history. This cannot be undone.</>}
              busy={delBusy}
              error={delErr}
              onConfirm={confirmDeleteStudent}
              onClose={() => setDelTarget(null)}
            />
          )}
        </div>
      )}

      {tab === "attendance" && (
        <div>
          <div className="row" style={{ marginBottom: 12, justifyContent: "space-between" }}>
            <div className="field" style={{ margin: 0, width: 180 }}>
              <input type="date" value={viewDate} max={today} onChange={e => changeViewDate(e.target.value)} />
            </div>
            <div className="row">
              {isToday && <button className="secondary" onClick={markAll}>Mark all present</button>}
              {isToday && <button onClick={save}>Save</button>}
              <ExportMenu type="attendance" branchId={branchId} date={viewDate} disabled={!students.length} />
              {!isToday && <span className="muted" style={{ fontSize: 13, alignSelf: "center" }}>Viewing past date — read only</span>}
            </div>
          </div>
          {students.map(s => {
            const st = attendance[s.id];
            return (
              <div className="list-item" key={s.id} onClick={() => toggle(s.id)} style={{ cursor: isToday ? "pointer" : "default" }}>
                <b>{s.name}</b>
                <span className="badge" style={{ color: st ? STATUS_COLOR[st] : "var(--muted)", textTransform: "capitalize" }}>{st || (isToday ? "tap to mark" : "no record")}</span>
              </div>
            );
          })}
          {!students.length && <p className="muted">Add students first.</p>}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="section-title">Class photos {isToday && "(max 2)"} {photoUploading && <span className="muted" style={{ fontWeight: 400 }}>(uploading…)</span>}</div>
            <div className="row" style={{ marginTop: 10 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={cld(p, { w: 180, h: 180, crop: "fill", gravity: "auto" })} alt="" style={{ width: 90, height: 90, borderRadius: 10, objectFit: "cover", cursor: "zoom-in" }} onClick={() => setLightbox(p)} />
                  {isToday && <button className="danger" style={{ padding: "2px 8px", marginTop: 4 }} onClick={() => removePhoto(i)}>✕</button>}
                </div>
              ))}
              {isToday && photos.length < 2 && <input type="file" accept="image/*" onChange={addPhoto} />}
              {!isToday && !photos.length && <span className="muted" style={{ fontSize: 13 }}>No photos for this date.</span>}
            </div>
          </div>
          {lightbox && (
            <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
              <img src={cld(lightbox, { w: 1600, crop: "limit" })} alt="" />
            </div>
          )}
        </div>
      )}

      {tab === "fees" && (
        <div>
          <div className="row" style={{ marginBottom: 14 }}>
            <ExportMenu type="fees" branchId={branchId} disabled={!students.length} />
          </div>
          {students.slice(feesPager.start, feesPager.end).map(s => {
            const f = feeByStudent[s.id];
            const h = historyByStudent[s.id];
            // Only money actually owed can be overdue. An *upcoming* billing date that has
            // already passed is not a late student — it is a fee nobody raised yet, so it
            // says so, in amber rather than red.
            const late = !!h?.next_due && !h.upcoming && h.next_due < today;
            const notRaised = !!h?.next_due && h.upcoming && h.next_due < today;
            const nextDueNote = late ? " (overdue)" : notRaised ? " (fee not raised)" : h?.upcoming ? " (upcoming)" : "";
            const nextDueStyle = late ? { color: "var(--danger)", fontWeight: 600 }
              : notRaised ? { color: "var(--warn)", fontWeight: 600 } : undefined;
            return (
              <div className="list-item" key={s.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div><b>{s.name}</b><div className="muted" style={{ fontSize: 13 }}>₹{s.monthly_fee}/mo · {fmtMonth(today)}{f ? ` · paid ₹${f.paid_amount} of ₹${f.amount}` : ""}</div></div>
                  <div className="row">
                    {f ? <span className={`badge ${f.status}`} style={{ textTransform: "capitalize" }}>{f.status}</span>
                      : <span className="muted" style={{ fontSize: 13 }}>no record</span>}
                    {isAdmin && !f && <button className="secondary" onClick={() => createFee(s)}>Create</button>}
                    {isAdmin && f && f.status !== "paid" && <button onClick={() => openPay(f)}>Record payment</button>}
                  </div>
                </div>
                {/* The three dates that answer the whole question: when this month's fee fell
                    due, when they last actually paid, and when they next owe. All three are
                    anchored on the student's admission day, so they can never disagree. */}
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4, display: "flex", flexWrap: "wrap", gap: "2px 14px" }}>
                  <span>Fee due: {f ? fmtDay(f.due_date) : "—"}</span>
                  <span>Last paid: {h?.last_paid ? fmtDay(h.last_paid) : "never"}</span>
                  <span>Next due: <span style={nextDueStyle}>{fmtDay(h?.next_due)}{nextDueNote}</span></span>
                  {h && h.outstanding > 0 ? <span style={{ color: "var(--danger)" }}>Outstanding: ₹{h.outstanding}</span> : null}
                </div>
                {f && f.payments && f.payments.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    {f.payments.map((p: any) => (
                      <div key={p.id} className="muted" style={{ fontSize: 13 }}>{fmtDay(p.paid_date)} · ₹{p.amount} · {p.method}{p.note ? ` · ${p.note}` : ""}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!students.length && <p className="muted">No students.</p>}
          {!isAdmin && <p className="muted" style={{ fontSize: 13 }}>Fees are managed by admins.</p>}
          <Pager page={feesPager.page} setPage={feesPager.setPage} totalPages={feesPager.totalPages} />

          {payTarget && (
            <Modal title={`Record payment — ${students.find(s => s.id === payTarget.student_id)?.name || ""}`} onClose={closePayModal}>
              <p className="muted" style={{ fontSize: 13 }}>Total ₹{payTarget.amount} · already paid ₹{payTarget.paid_amount}</p>
              <div className="field"><label>Amount</label><input value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
              <div className="field">
                <label>Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option>
                </select>
              </div>
              {err && <div className="err">{err}</div>}
              <div className="row">
                <button onClick={submitPay} disabled={!payAmount || parseFloat(payAmount) <= 0}>Save payment</button>
                <button className="secondary" onClick={closePayModal}>Cancel</button>
              </div>
            </Modal>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div>
          {isAdmin && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="section-title">{scEditId ? "Edit class" : "Add class"}</div>
              <div className="row" style={{ marginTop: 10 }}>
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
                <button onClick={saveSchedule} disabled={!scForm.title}>{scEditId ? "Update" : "Add"}</button>
                {scEditId && <button className="secondary" onClick={cancelScheduleEdit}>Cancel</button>}
              </div>
            </div>
          )}
          {schedules.slice(schedulePager.start, schedulePager.end).map(s => (
            <div className="list-item" key={s.id}>
              <div><b>{s.title}</b><div className="muted" style={{ fontSize: 13 }}>{DAYS[s.day_of_week]} · {s.start_time}–{s.end_time}{s.trainer_id ? ` · ${trainers.find(t => t.id === s.trainer_id)?.name || "trainer"}` : ""}</div></div>
              {isAdmin && (
                <RowMenu label={`Actions for ${s.title}`}>
                  {close => (
                    <>
                      <button className="menu-item" role="menuitem" onClick={() => { editSchedule(s); close(); }}><span>Edit</span></button>
                      <button className="menu-item" role="menuitem" onClick={() => { openDeleteSchedule(s); close(); }}>
                        <span style={{ color: "var(--danger)" }}>Delete</span>
                      </button>
                    </>
                  )}
                </RowMenu>
              )}
            </div>
          ))}
          {!schedules.length && <p className="muted">No classes scheduled.</p>}
          <Pager page={schedulePager.page} setPage={schedulePager.setPage} totalPages={schedulePager.totalPages} />

          {scDelTarget && (
            <ConfirmDeleteModal
              title="Delete class"
              message={<>This removes the <b>{scDelTarget.title}</b> class ({DAYS[scDelTarget.day_of_week]} {scDelTarget.start_time}–{scDelTarget.end_time}) from the schedule. This cannot be undone.</>}
              busy={scDelBusy}
              error={scDelErr}
              onConfirm={confirmDeleteSchedule}
              onClose={() => setScDelTarget(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
