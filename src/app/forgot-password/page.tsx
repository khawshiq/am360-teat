"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import AuthShell from "@/components/AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false); const [err, setErr] = useState("");
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await api.forgotPassword(email); setSent(true); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  if (sent) return (
    <AuthShell title="Check your email" subtitle={`If an account exists for ${email}, a reset link is on its way.`}>
      <p className="auth-note" style={{ marginBottom: 20 }}>
        The link expires in 1 hour. Don&apos;t see it? Check your spam folder.
      </p>
      <Link href="/login"><button className="secondary btn-block">Back to sign in</button></Link>
    </AuthShell>
  );

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link"
      footer={<>Remembered it? <Link className="link" href="/login">Sign in</Link></>}
    >
      <div className="field"><label>Email</label>
        <input type="email" autoComplete="email" placeholder="you@academy.com" value={email}
          onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
      </div>
      {err && <div className="err">{err}</div>}
      <button disabled={busy || !email} onClick={submit} className="btn-block">{busy ? "Sending…" : "Send reset link"}</button>
    </AuthShell>
  );
}
