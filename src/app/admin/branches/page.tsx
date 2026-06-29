"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

export default function Branches() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = () => api.listBranches().then(setItems).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const reset = () => { setForm({ name: "", address: "", phone: "" }); setEditId(null); };
  const save = async () => {
    setErr("");
    try { editId ? await api.updateBranch(editId, form) : await api.createBranch(form); reset(); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const edit = (b: any) => { setEditId(b.id); setForm({ name: b.name, address: b.address || "", phone: b.phone || "" }); };
  const del = async (id: string) => { if (confirm("Delete branch and its students?")) { await api.deleteBranch(id); load(); } };

  return (
    <div className="grid" style={{ gridTemplateColumns: "360px 1fr" }}>
      <div className="card" style={{ alignSelf: "start" }}>
        <b>{editId ? "Edit branch" : "Add branch"}</b>
        <div style={{ marginTop: 14 }}>
          <div className="field"><label>Name</label><input value={form.name} onChange={set("name")} /></div>
          <div className="field"><label>Address</label><input value={form.address} onChange={set("address")} /></div>
          <div className="field"><label>Phone</label><input value={form.phone} onChange={set("phone")} /></div>
          {err && <div className="err">{err}</div>}
          <div className="row">
            <button onClick={save} disabled={!form.name}>{editId ? "Update" : "Add"}</button>
            {editId && <button className="secondary" onClick={reset}>Cancel</button>}
          </div>
        </div>
      </div>
      <div>
        {items.map(b => (
          <div className="list-item" key={b.id}>
            <Link href={`/admin/branch/${b.id}`} style={{ flex: 1 }}>
              <div><b>{b.name}</b> <span className="muted" style={{ fontSize: 12 }}>→ open</span></div>
              <div className="muted" style={{ fontSize: 13 }}>{b.address || "—"} · {b.phone || "—"}</div>
            </Link>
            <div className="row">
              <button className="secondary" onClick={() => edit(b)}>Edit</button>
              <button className="danger" onClick={() => del(b.id)}>Delete</button>
            </div>
          </div>
        ))}
        {!items.length && <p className="muted">No branches yet — add your first one.</p>}
      </div>
    </div>
  );
}
