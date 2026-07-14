"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import GoogleSignIn from "@/components/GoogleSignIn";
import AuthShell from "@/components/AuthShell";
import AuthField from "@/components/AuthField";
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
      title={<>Welcome <em>back!</em></>}
      subtitle="Sign in to your AM360 account"
      footer={<>No account? <Link className="link" href="/register">Create one</Link></>}
    >
      <AuthField
        label="Email" icon="mail" type="email" autoComplete="email"
        placeholder="you@academy.com" value={email} onChange={setEmail} onEnter={submit}
      />
      <AuthField
        label="Password" icon="lock" type="password" autoComplete="current-password"
        placeholder="••••••••" value={password} onChange={setPassword} onEnter={submit}
        right={<Link href="/forgot-password" className="link" style={{ fontSize: 12.5 }}>Forgot?</Link>}
      />
      {err && <div className="err">{err}</div>}
      <button disabled={busy} onClick={submit} className="btn-block btn-grad">
        {busy ? "Signing in…" : "Sign in"}
        {!busy && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
        )}
      </button>

      {showGoogle && (
        <>
          <div className="auth-divider"><span>OR</span></div>
          <GoogleSignIn onCredential={onGoogle} onError={setErr} />
        </>
      )}
    </AuthShell>
  );
}
