"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useImageUpload } from "@/lib/useImageUpload";
import { cld } from "@/lib/cloudinary";

export default function Settings() {
  const [form, setForm] = useState<any>({ name: "", description: "", logo_url: null });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const { uploading: up, onFileChange } = useImageUpload("am360/logos");
  useEffect(() => { api.getAcademy().then(setForm).catch(e => setErr(e.message)); }, []);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const onLogo = (e: any) => onFileChange(e, url => setForm((s: any) => ({ ...s, logo_url: url })), setErr);
  const save = async () => {
    setErr(""); setMsg("");
    try {
      await api.updateAcademy({
        name: form.name, description: form.description, logo_url: form.logo_url,
        subscription_plan: form.subscription_plan, subscription_status: form.subscription_status, subscription_expires: form.subscription_expires,
      });
      setMsg("Saved.");
    } catch (e: any) { setErr(e.message); }
  };
  return (
    <div className="grid" style={{ gridTemplateColumns: "520px 1fr" }}>
      <div className="card">
        <b>Academy profile</b>
        <div style={{ marginTop: 14 }}>
          {form.logo_url ? <img src={cld(form.logo_url, { w: 160, h: 160, crop: "fill", gravity: "auto" })} alt="logo" style={{ width: 80, height: 80, borderRadius: 14, objectFit: "cover", marginBottom: 12 }} /> : null}
          <div className="field"><label>Logo {up && <span className="muted">(uploading…)</span>}</label><input type="file" accept="image/*" onChange={onLogo} /></div>
          <div className="field"><label>Name</label><input value={form.name || ""} onChange={set("name")} /></div>
          <div className="field"><label>Description</label><textarea rows={3} value={form.description || ""} onChange={set("description")} /></div>
          {err && <div className="err">{err}</div>}
          {msg && <div style={{ color: "var(--ok)", fontSize: 14, marginBottom: 8 }}>{msg}</div>}
          <div className="row">
            <button onClick={save}>Save changes</button>
            <Link href="/change-password"><button className="secondary" type="button">Change Password</button></Link>
          </div>
        </div>
      </div>
      <div className="card" style={{ alignSelf: "start" }}>
        <b>Subscription</b>
        <div style={{ marginTop: 14 }}>
          <div className="field">
            <label>Plan</label>
            <select value={form.subscription_plan || "free"} onChange={set("subscription_plan")}>
              <option value="free">Free</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.subscription_status || "active"} onChange={set("subscription_status")}>
              <option value="active">Active</option><option value="trial">Trial</option><option value="past_due">Past due</option><option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="field"><label>Expires</label><input type="date" value={form.subscription_expires || ""} onChange={set("subscription_expires")} /></div>
        </div>
      </div>
    </div>
  );
}
