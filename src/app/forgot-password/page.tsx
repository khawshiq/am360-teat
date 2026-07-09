"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false); const [err, setErr] = useState("");
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await api.forgotPassword(email); setSent(true); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="center">
      <div className="card" style={{ width: 380 }}>
        <div className="brand">AM <span>360</span></div>
        {sent ? (
          <>
            <p className="muted" style={{ marginBottom: 8 }}>Check your email</p>
            <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>
              If an account exists for <b>{email}</b>, we&apos;ve sent a link to reset your password. It expires in 1 hour.
            </p>
            <Link href="/login"><button className="secondary" style={{ width: "100%" }}>Back to sign in</button></Link>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 20 }}>Reset your password</p>
            <div className="field"><label>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
            </div>
            {err && <div className="err">{err}</div>}
            <button disabled={busy || !email} onClick={submit} style={{ width: "100%" }}>{busy ? "..." : "Send reset link"}</button>
            <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>Remembered it? <Link href="/login" style={{ color: "var(--accent2)" }}>Sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
