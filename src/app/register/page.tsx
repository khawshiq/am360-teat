"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";

export default function Register() {
  const { register } = useAuth();
  const [f, setF] = useState({ academy_name: "", owner_name: "", email: "", password: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await register(f); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="center">
      <div className="card" style={{ width: 400 }}>
        <div className="brand">AM <span>360</span></div>
        <p className="muted" style={{ marginBottom: 20 }}>Register your academy</p>
        <div className="field"><label>Academy name</label><input value={f.academy_name} onChange={set("academy_name")} /></div>
        <div className="field"><label>Your name</label><input value={f.owner_name} onChange={set("owner_name")} /></div>
        <div className="field"><label>Email</label><input value={f.email} onChange={set("email")} /></div>
        <div className="field"><label>Password</label><input type="password" value={f.password} onChange={set("password")} /></div>
        {err && <div className="err">{err}</div>}
        <button disabled={busy} onClick={submit} style={{ width: "100%" }}>{busy ? "..." : "Create academy"}</button>
        <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>Have an account? <Link href="/login" style={{ color: "var(--accent2)" }}>Sign in</Link></p>
      </div>
    </div>
  );
}
