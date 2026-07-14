"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import GoogleSignIn from "@/components/GoogleSignIn";
import AuthShell from "@/components/AuthShell";
import AuthField from "@/components/AuthField";
import { isNativeApp } from "@/lib/platform";

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const [f, setF] = useState({ academy_name: "", owner_name: "", email: "", password: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  const showGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && !native;
  const set = (k: string) => (v: string) => setF({ ...f, [k]: v });
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await register(f); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const onGoogle = async (credential: string) => {
    setErr(""); setBusy(true);
    try { await loginWithGoogle(credential); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell
      title={<>Create your <em>academy</em></>}
      subtitle="Set up AM360 for your organisation in seconds"
      footer={<>Already have an account? <Link className="link" href="/login">Sign in</Link></>}
    >
      <AuthField label="Academy name" icon="academy" placeholder="Bright Future Academy"
                 value={f.academy_name} onChange={set("academy_name")} />
      <AuthField label="Your name" icon="user" placeholder="Full name"
                 value={f.owner_name} onChange={set("owner_name")} />
      <AuthField label="Email" icon="mail" type="email" autoComplete="email" placeholder="you@academy.com"
                 value={f.email} onChange={set("email")} />
      <AuthField label="Password" icon="lock" type="password" autoComplete="new-password"
                 placeholder="At least 6 characters" value={f.password} onChange={set("password")} onEnter={submit} />
      {err && <div className="err">{err}</div>}
      <button disabled={busy} onClick={submit} className="btn-block btn-grad">
        {busy ? "Creating…" : "Create academy"}
        {!busy && (
          <svg className="cta-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
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
