"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import GoogleSignIn from "@/components/GoogleSignIn";
import AuthShell from "@/components/AuthShell";
import { isNativeApp } from "@/lib/platform";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  const showGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && !native;
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await login(email, password); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const onGoogle = async (credential: string) => {
    setErr(""); setBusy(true);
    try { await loginWithGoogle(credential); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your AM360 account"
      footer={<>No account? <Link className="link" href="/register">Create one</Link></>}
    >
      <div className="field"><label>Email</label>
        <input type="email" autoComplete="email" placeholder="you@academy.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <div className="field-row">
          <label>Password</label>
          <Link href="/forgot-password" className="link" style={{ fontSize: 12.5 }}>Forgot?</Link>
        </div>
        <input type="password" autoComplete="current-password" placeholder="••••••••" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
      </div>
      {err && <div className="err">{err}</div>}
      <button disabled={busy} onClick={submit} className="btn-block">{busy ? "Signing in…" : "Sign in"}</button>

      {showGoogle && (
        <>
          <div className="auth-divider"><span>OR</span></div>
          <GoogleSignIn onCredential={onGoogle} onError={setErr} />
        </>
      )}
    </AuthShell>
  );
}
