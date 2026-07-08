"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useImageUpload } from "@/lib/useImageUpload";
import { cld } from "@/lib/cloudinary";
import Pager, { usePager } from "@/components/Pager";

const emptyForm = { name: "", email: "", username: "", password: "", phone: "", address: "", photo_url: "", joining_date: "", branch_ids: [] as string[] };

export default function Trainers() {
  const [items, setItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const { uploading, onFileChange } = useImageUpload("am360/trainers");
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [tempPw, setTempPw] = useState<{ name: string; pw: string } | null>(null);

  const load = () => Promise.all([api.listTrainers(showInactive), api.listBranches()])
    .then(([t, b]) => { setItems(t); setBranches(b); }).catch(e => setErr(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);
  const bName = (id: string) => branches.find(b => b.id === id)?.name || id;
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const toggleBranch = (id: string) => setForm((f: any) => ({
    ...f, branch_ids: f.branch_ids.includes(id) ? f.branch_ids.filter((x: string) => x !== id) : [...f.branch_ids, id],
  }));
  const reset = () => { setForm(emptyForm); setEditId(null); };
  const save = async () => {
    setErr("");
    try {
      if (editId) await api.updateTrainer(editId, { name: form.name, phone: form.phone, address: form.address, photo_url: form.photo_url, joining_date: form.joining_date || null, branch_ids: form.branch_ids });
      else await api.createTrainer(form);
      reset(); load();
    } catch (e: any) { setErr(e.message); }
  };
  const edit = (t: any) => { setEditId(t.id); setForm({ name: t.name, email: t.email, username: t.username || "", password: "", phone: t.phone || "", address: t.address || "", photo_url: t.photo_url || "", joining_date: t.joining_date || "", branch_ids: t.branch_ids || (t.branch_id ? [t.branch_id] : []) }); };
  const onPhoto = (e: any) => onFileChange(e, url => setForm((s: any) => ({ ...s, photo_url: url })), setErr);
  const del = async (id: string) => { if (confirm("Delete trainer?")) { await api.deleteTrainer(id); load(); } };
  const resetPw = async (t: any) => {
    if (!confirm(`Reset password for ${t.name}? A new temporary password will be issued.`)) return;
    try { const res = await api.resetTrainerPassword(t.id); setTempPw({ name: t.name, pw: res.temp_password }); }
    catch (e: any) { setErr(e.message); }
  };
  const toggleStatus = async (t: any) => {
    try { await api.updateTrainer(t.id, { status: t.status === "active" ? "inactive" : "active" }); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const { page, setPage, totalPages, start, end } = usePager(items.length);

  return (
    <div className="grid" style={{ gridTemplateColumns: "360px 1fr" }}>
      <div className="card" style={{ alignSelf: "start" }}>
        <b>{editId ? "Edit trainer" : "Add trainer"}</b>
        <div style={{ marginTop: 14 }}>
          <div className="field"><label>Name</label><input value={form.name} onChange={set("name")} /></div>
          {!editId && <>
            <div className="field"><label>Email</label><input value={form.email} onChange={set("email")} /></div>
            <div className="field"><label>Username (optional)</label><input value={form.username} onChange={set("username")} /></div>
            <div className="field"><label>Password</label><input type="password" value={form.password} onChange={set("password")} /></div>
          </>}
          <div className="field"><label>Phone</label><input value={form.phone} onChange={set("phone")} /></div>
          <div className="field"><label>Address</label><input value={form.address} onChange={set("address")} /></div>
          <div className="field"><label>Joining date</label><input type="date" value={form.joining_date} onChange={set("joining_date")} /></div>
          <div className="field">
            <label>Photo {uploading && <span className="muted">(uploading…)</span>}</label>
            {form.photo_url && <img src={cld(form.photo_url, { w: 112, h: 112, crop: "fill", gravity: "auto" })} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", marginBottom: 8, display: "block" }} />}
            <input type="file" accept="image/*" onChange={onPhoto} />
          </div>
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
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <label className="row" style={{ fontSize: 13, gap: 6 }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Show inactive
          </label>
        </div>
        {tempPw && (
          <div className="card" style={{ marginBottom: 14, borderColor: "var(--ok)" }}>
            <b>Temporary password for {tempPw.name}</b>
            <p style={{ fontFamily: "monospace", fontSize: 16, margin: "8px 0" }}>{tempPw.pw}</p>
            <p className="muted" style={{ fontSize: 13 }}>Share this with the trainer — they'll be forced to change it on next login.</p>
            <button className="secondary" onClick={() => setTempPw(null)}>Dismiss</button>
          </div>
        )}
        {items.slice(start, end).map(t => (
          <div className="list-item" key={t.id}>
            <div>
              <div><b>{t.name}</b> {t.status !== "active" && <span className="badge" style={{ color: "var(--muted)" }}>inactive</span>}</div>
              <div className="muted" style={{ fontSize: 13 }}>{t.email} · {(t.branch_ids || []).map(bName).join(", ") || "—"}</div>
            </div>
            <div className="row">
              <button className="secondary" onClick={() => edit(t)}>Edit</button>
              <button className="secondary" onClick={() => resetPw(t)}>Reset Password</button>
              <button className="secondary" onClick={() => toggleStatus(t)}>{t.status === "active" ? "Deactivate" : "Activate"}</button>
              <button className="danger" onClick={() => del(t.id)}>Delete</button>
            </div>
          </div>
        ))}
        {!items.length && <p className="muted">No trainers yet.</p>}
        <Pager page={page} setPage={setPage} totalPages={totalPages} />
      </div>
    </div>
  );
}
