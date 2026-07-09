"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import AuthShell from "@/components/AuthShell";

export default function ResetPassword() {
  const router = useRouter();
  // null = still reading the URL; "" = no token present; string = token
  const [token, setToken] = useState<string | null>(null);
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [done, setDone] = useState(false);

  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);

  const submit = async () => {
    setErr("");
    if (pw.length < 6) return setErr("Password must be at least 6 characters");
    if (pw !== pw2) return setErr("Passwords do not match");
    setBusy(true);
    try { await api.resetPassword({ token: token as string, password: pw }); setDone(true); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  if (done) return (
    <AuthShell title="Password reset" subtitle="Your password has been updated successfully.">
      <button onClick={() => router.push("/login")} className="btn-block">Go to sign in</button>
    </AuthShell>
  );

  if (token === null) return (
    <AuthShell title="Reset password"><p className="auth-note">Loading…</p></AuthShell>
  );

  if (!token) return (
    <AuthShell title="Invalid link" subtitle="This reset link is missing or malformed.">
      <p className="auth-note" style={{ marginBottom: 20 }}>Reset links expire after 1 hour and can be used once.</p>
      <Link href="/forgot-password"><button className="btn-block">Request a new link</button></Link>
    </AuthShell>
  );

  return (
    <AuthShell title="Choose a new password" subtitle="Make it at least 6 characters.">
      <div className="field"><label>New password</label>
        <input type="password" autoComplete="new-password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} />
      </div>
      <div className="field"><label>Confirm password</label>
        <input type="password" autoComplete="new-password" placeholder="••••••••" value={pw2}
          onChange={e => setPw2(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
      </div>
      {err && <div className="err">{err}</div>}
      <button disabled={busy} onClick={submit} className="btn-block">{busy ? "Resetting…" : "Reset password"}</button>
    </AuthShell>
  );
}
