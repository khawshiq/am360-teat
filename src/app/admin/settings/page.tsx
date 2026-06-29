"use client";
import { useEffect, useState } from "react";
import { api, uploadImage } from "@/lib/client";

export default function Settings() {
  const [form, setForm] = useState<any>({ name: "", description: "", logo_url: null });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [up, setUp] = useState(false);
  useEffect(() => { api.getAcademy().then(setForm).catch(e => setErr(e.message)); }, []);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const onLogo = async (e: any) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUp(true); setErr("");
    try { setForm((s: any) => ({ ...s, logo_url: "" })); const url = await uploadImage(f, "am360/logos"); setForm((s: any) => ({ ...s, logo_url: url })); }
    catch (e: any) { setErr("Image upload failed: " + e.message); } finally { setUp(false); }
  };
  const save = async () => {
    setErr(""); setMsg("");
    try { await api.updateAcademy({ name: form.name, description: form.description, logo_url: form.logo_url }); setMsg("Saved."); }
    catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <b>Academy profile</b>
      <div style={{ marginTop: 14 }}>
        {form.logo_url ? <img src={form.logo_url} alt="logo" style={{ width: 80, height: 80, borderRadius: 14, objectFit: "cover", marginBottom: 12 }} /> : null}
        <div className="field"><label>Logo {up && <span className="muted">(uploading…)</span>}</label><input type="file" accept="image/*" onChange={onLogo} /></div>
        <div className="field"><label>Name</label><input value={form.name || ""} onChange={set("name")} /></div>
        <div className="field"><label>Description</label><textarea rows={3} value={form.description || ""} onChange={set("description")} /></div>
        {err && <div className="err">{err}</div>}
        {msg && <div style={{ color: "var(--ok)", fontSize: 14, marginBottom: 8 }}>{msg}</div>}
        <button onClick={save}>Save changes</button>
      </div>
    </div>
  );
}
