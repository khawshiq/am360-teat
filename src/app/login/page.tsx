"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await login(email, password); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="center">
      <div className="card" style={{ width: 380 }}>
        <div className="brand">AM <span>360</span></div>
        <p className="muted" style={{ marginBottom: 20 }}>Sign in to your account</p>
        <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        {err && <div className="err">{err}</div>}
        <button disabled={busy} onClick={submit} style={{ width: "100%" }}>{busy ? "..." : "Sign in"}</button>
        <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>No account? <Link href="/register" style={{ color: "var(--accent2)" }}>Create one</Link></p>
      </div>
    </div>
  );
}
