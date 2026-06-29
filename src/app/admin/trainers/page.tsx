"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function Trainers() {
  const [items, setItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: "", email: "", password: "", phone: "", branch_ids: [] });
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = () => Promise.all([api.listTrainers(), api.listBranches()])
    .then(([t, b]) => { setItems(t); setBranches(b); }).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const bName = (id: string) => branches.find(b => b.id === id)?.name || id;
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const toggleBranch = (id: string) => setForm((f: any) => ({
    ...f, branch_ids: f.branch_ids.includes(id) ? f.branch_ids.filter((x: string) => x !== id) : [...f.branch_ids, id],
  }));
  const reset = () => { setForm({ name: "", email: "", password: "", phone: "", branch_ids: [] }); setEditId(null); };
  const save = async () => {
    setErr("");
    try {
      if (editId) await api.updateTrainer(editId, { name: form.name, phone: form.phone, branch_ids: form.branch_ids });
      else await api.createTrainer(form);
      reset(); load();
    } catch (e: any) { setErr(e.message); }
  };
  const edit = (t: any) => { setEditId(t.id); setForm({ name: t.name, email: t.email, password: "", phone: t.phone || "", branch_ids: t.branch_ids || (t.branch_id ? [t.branch_id] : []) }); };
  const del = async (id: string) => { if (confirm("Delete trainer?")) { await api.deleteTrainer(id); load(); } };

  return (
    <div className="grid" style={{ gridTemplateColumns: "360px 1fr" }}>
      <div className="card" style={{ alignSelf: "start" }}>
        <b>{editId ? "Edit trainer" : "Add trainer"}</b>
        <div style={{ marginTop: 14 }}>
          <div className="field"><label>Name</label><input value={form.name} onChange={set("name")} /></div>
          {!editId && <>
            <div className="field"><label>Email</label><input value={form.email} onChange={set("email")} /></div>
            <div className="field"><label>Password</label><input type="password" value={form.password} onChange={set("password")} /></div>
          </>}
          <div className="field"><label>Phone</label><input value={form.phone} onChange={set("phone")} /></div>
          <div className="field">
            <label>Assigned branches</label>
            <div className="row">
              {branches.map(b => (
                <button key={b.id} type="button" className={form.branch_ids.includes(b.id) ? "" : "secondary"}
                  style={{ fontSize: 13, padding: "6px 12px" }} onClick={() => toggleBranch(b.id)}>{b.name}</button>
              ))}
              {!branches.length && <span className="muted">Add a branch first.</span>}
            </div>
          </div>
          {err && <div className="err">{err}</div>}
          <div className="row">
            <button onClick={save} disabled={!form.name || (!editId && (!form.email || !form.password)) || !form.branch_ids.length}>{editId ? "Update" : "Add"}</button>
            {editId && <button className="secondary" onClick={reset}>Cancel</button>}
          </div>
        </div>
      </div>
      <div>
        {items.map(t => (
          <div className="list-item" key={t.id}>
            <div>
              <div><b>{t.name}</b></div>
              <div className="muted" style={{ fontSize: 13 }}>{t.email} · {(t.branch_ids || []).map(bName).join(", ") || "—"}</div>
            </div>
            <div className="row">
              <button className="secondary" onClick={() => edit(t)}>Edit</button>
              <button className="danger" onClick={() => del(t.id)}>Delete</button>
            </div>
          </div>
        ))}
        {!items.length && <p className="muted">No trainers yet.</p>}
      </div>
    </div>
  );
}
