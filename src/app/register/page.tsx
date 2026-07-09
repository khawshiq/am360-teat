"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import GoogleSignIn from "@/components/GoogleSignIn";
import AuthShell from "@/components/AuthShell";
import { isNativeApp } from "@/lib/platform";

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const [f, setF] = useState({ academy_name: "", owner_name: "", email: "", password: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  const showGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && !native;
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
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
      title="Create your academy"
      subtitle="Set up AM360 for your organisation in seconds"
      footer={<>Already have an account? <Link className="link" href="/login">Sign in</Link></>}
    >
      <div className="field"><label>Academy name</label>
        <input placeholder="Bright Future Academy" value={f.academy_name} onChange={set("academy_name")} />
      </div>
      <div className="field"><label>Your name</label>
        <input placeholder="Full name" value={f.owner_name} onChange={set("owner_name")} />
      </div>
      <div className="field"><label>Email</label>
        <input type="email" autoComplete="email" placeholder="you@academy.com" value={f.email} onChange={set("email")} />
      </div>
      <div className="field"><label>Password</label>
        <input type="password" autoComplete="new-password" placeholder="At least 6 characters" value={f.password}
          onChange={set("password")} onKeyDown={e => e.key === "Enter" && submit()} />
      </div>
      {err && <div className="err">{err}</div>}
      <button disabled={busy} onClick={submit} className="btn-block">{busy ? "Creating…" : "Create academy"}</button>

      {showGoogle && (
        <>
          <div className="auth-divider"><span>OR</span></div>
          <GoogleSignIn onCredential={onGoogle} onError={setErr} />
        </>
      )}
    </AuthShell>
  );
}
