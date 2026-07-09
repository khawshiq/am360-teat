"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import GoogleSignIn from "@/components/GoogleSignIn";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await login(email, password); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const onGoogle = async (credential: string) => {
    setErr(""); setBusy(true);
    try { await loginWithGoogle(credential); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="center">
      <div className="card" style={{ width: 380 }}>
        <div className="brand">AM <span>360</span></div>
        <p className="muted" style={{ marginBottom: 20 }}>Sign in to your account</p>
        <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label>Password</label>
            <Link href="/forgot-password" style={{ color: "var(--accent2)", fontSize: 13 }}>Forgot?</Link>
          </div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        {err && <div className="err">{err}</div>}
        <button disabled={busy} onClick={submit} style={{ width: "100%" }}>{busy ? "..." : "Sign in"}</button>

        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span className="muted" style={{ fontSize: 12 }}>or</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <GoogleSignIn onCredential={onGoogle} onError={setErr} />
          </>
        )}

        <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>No account? <Link href="/register" style={{ color: "var(--accent2)" }}>Create one</Link></p>
      </div>
    </div>
  );
}
