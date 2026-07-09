"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Pager, { usePager } from "@/components/Pager";

const emptyCourse = { name: "", description: "" };
const emptyBatch = { name: "", branch_id: "", course_id: "", trainer_id: "", start_time: "", end_time: "" };

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [cForm, setCForm] = useState<any>(emptyCourse);
  const [cEditId, setCEditId] = useState<string | null>(null);
  const [bForm, setBForm] = useState<any>(emptyBatch);
  const [bEditId, setBEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = () => Promise.all([api.listCourses(), api.listBatches(), api.listBranches(), api.listTrainers()])
    .then(([c, ba, br, t]) => { setCourses(c); setBatches(ba); setBranches(br); setTrainers(t); })
    .catch(e => setErr(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const name = (list: any[], id: string) => list.find(x => x.id === id)?.name || "—";

  // --- courses ---
  const cSet = (k: string) => (e: any) => setCForm({ ...cForm, [k]: e.target.value });
  const cReset = () => { setCForm(emptyCourse); setCEditId(null); };
  const cSave = async () => {
    setErr("");
    try {
      if (cEditId) await api.updateCourse(cEditId, cForm);
      else await api.createCourse(cForm);
      cReset(); load();
    } catch (e: any) { setErr(e.message); }
  };
  const cEdit = (c: any) => { setCEditId(c.id); setCForm({ name: c.name, description: c.description || "" }); };
  const cDel = async (id: string) => { if (confirm("Delete course?")) { await api.deleteCourse(id); load(); } };

  // --- batches ---
  const bSet = (k: string) => (e: any) => setBForm({ ...bForm, [k]: e.target.value });
  const bReset = () => { setBForm(emptyBatch); setBEditId(null); };
  const bSave = async () => {
    setErr("");
    try {
      const payload = { ...bForm, course_id: bForm.course_id || null, trainer_id: bForm.trainer_id || null };
      if (bEditId) await api.updateBatch(bEditId, payload);
      else await api.createBatch(payload);
      bReset(); load();
    } catch (e: any) { setErr(e.message); }
  };
  const bEdit = (b: any) => { setBEditId(b.id); setBForm({ name: b.name, branch_id: b.branch_id, course_id: b.course_id || "", trainer_id: b.trainer_id || "", start_time: b.start_time || "", end_time: b.end_time || "" }); };
  const bDel = async (id: string) => { if (confirm("Delete batch?")) { await api.deleteBatch(id); load(); } };

  const cPager = usePager(courses.length);
  const bPager = usePager(batches.length);

  return (
    <div className="split even">
      {/* Courses */}
      <div>
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="section-title">{cEditId ? "Edit course" : "Add course"}</div>
          <div>
            <div className="field"><label>Name</label><input value={cForm.name} onChange={cSet("name")} /></div>
            <div className="field"><label>Description</label><input value={cForm.description} onChange={cSet("description")} /></div>
            {err && <div className="err">{err}</div>}
            <div className="row">
              <button onClick={cSave} disabled={!cForm.name}>{cEditId ? "Update" : "Add"}</button>
              {cEditId && <button className="secondary" onClick={cReset}>Cancel</button>}
            </div>
          </div>
        </div>
        {courses.slice(cPager.start, cPager.end).map(c => (
          <div className="list-item" key={c.id}>
            <div>
              <div><b>{c.name}</b></div>
              <div className="muted" style={{ fontSize: 13 }}>{c.description || "—"}</div>
            </div>
            <div className="row">
              <button className="secondary" onClick={() => cEdit(c)}>Edit</button>
              <button className="danger" onClick={() => cDel(c.id)}>Delete</button>
            </div>
          </div>
        ))}
        {!courses.length && <p className="muted">No courses yet.</p>}
        <Pager page={cPager.page} setPage={cPager.setPage} totalPages={cPager.totalPages} />
      </div>

      {/* Batches */}
      <div>
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="section-title">{bEditId ? "Edit batch" : "Add batch"}</div>
          <div>
            <div className="field"><label>Name</label><input value={bForm.name} onChange={bSet("name")} /></div>
            <div className="field">
              <label>Branch</label>
              <select value={bForm.branch_id} onChange={bSet("branch_id")}>
                <option value="">Select branch…</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Course (optional)</label>
              <select value={bForm.course_id} onChange={bSet("course_id")}>
                <option value="">—</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Trainer (optional)</label>
              <select value={bForm.trainer_id} onChange={bSet("trainer_id")}>
                <option value="">—</option>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="row">
              <div className="field" style={{ flex: 1 }}><label>Start time</label><input type="time" value={bForm.start_time} onChange={bSet("start_time")} /></div>
              <div className="field" style={{ flex: 1 }}><label>End time</label><input type="time" value={bForm.end_time} onChange={bSet("end_time")} /></div>
            </div>
            <div className="row">
              <button onClick={bSave} disabled={!bForm.name || !bForm.branch_id}>{bEditId ? "Update" : "Add"}</button>
              {bEditId && <button className="secondary" onClick={bReset}>Cancel</button>}
            </div>
          </div>
        </div>
        {batches.slice(bPager.start, bPager.end).map(b => (
          <div className="list-item" key={b.id}>
            <div>
              <div><b>{b.name}</b> {(b.start_time || b.end_time) && <span className="muted" style={{ fontSize: 13 }}>{b.start_time}–{b.end_time}</span>}</div>
              <div className="muted" style={{ fontSize: 13 }}>{name(branches, b.branch_id)} · {b.course_id ? name(courses, b.course_id) : "no course"} · {b.trainer_id ? name(trainers, b.trainer_id) : "no trainer"}</div>
            </div>
            <div className="row">
              <button className="secondary" onClick={() => bEdit(b)}>Edit</button>
              <button className="danger" onClick={() => bDel(b.id)}>Delete</button>
            </div>
          </div>
        ))}
        {!batches.length && <p className="muted">No batches yet.</p>}
        <Pager page={bPager.page} setPage={bPager.setPage} totalPages={bPager.totalPages} />
      </div>
    </div>
  );
}
