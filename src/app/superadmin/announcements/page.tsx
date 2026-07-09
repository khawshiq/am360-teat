"use client";
import { useEffect, useState } from "react";
import { sa } from "@/lib/saclient";

export default function Announcements() {
  const [items, setItems] = useState<any[]>([]);
  const [academies, setAcademies] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", academy_id: "" });
  const [err, setErr] = useState("");

  const load = () => Promise.all([sa.listAnnouncements(), sa.listAcademies()])
    .then(([a, ac]) => { setItems(a); setAcademies(ac); }).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const send = async () => {
    setErr("");
    try {
      await sa.createAnnouncement({ title: form.title, body: form.body, academy_id: form.academy_id || null });
      setForm({ title: "", body: "", academy_id: "" }); load();
    } catch (e: any) { setErr(e.message); }
  };
  const acName = (id: string | null) => id ? (academies.find(a => a.id === id)?.name || id) : "All academies";

  return (
    <div className="split sidebar">
      <div className="card">
        <b>New announcement</b>
        <div style={{ marginTop: 14 }}>
          <div className="field"><label>Title</label><input value={form.title} onChange={set("title")} /></div>
          <div className="field"><label>Message</label><textarea value={form.body} onChange={set("body")} rows={4} /></div>
          <div className="field">
            <label>Audience</label>
            <select value={form.academy_id} onChange={set("academy_id")}>
              <option value="">All academies (broadcast)</option>
              {academies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {err && <div className="err">{err}</div>}
          <button onClick={send} disabled={!form.title || !form.body}>Send</button>
        </div>
      </div>
      <div>
        {items.map(a => (
          <div className="list-item" key={a.id}>
            <div>
              <div><b>{a.title}</b> <span className="badge">{acName(a.academy_id)}</span></div>
              <div className="muted" style={{ fontSize: 13 }}>{a.body}</div>
              <div className="muted" style={{ fontSize: 11 }}>{new Date(a.created_at).toLocaleString()} · {a.created_by}</div>
            </div>
          </div>
        ))}
        {!items.length && <p className="muted">No announcements yet.</p>}
      </div>
    </div>
  );
}
