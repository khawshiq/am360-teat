"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

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

  return (
    <div className="center">
      <div className="card" style={{ width: 380 }}>
        <div className="brand">AM <span>360</span></div>
        {done ? (
          <>
            <p className="muted" style={{ marginBottom: 20 }}>Your password has been reset. You can now sign in with it.</p>
            <button onClick={() => router.push("/login")} style={{ width: "100%" }}>Go to sign in</button>
          </>
        ) : token === null ? (
          <p className="muted">Loading…</p>
        ) : !token ? (
          <p className="muted">Invalid reset link. <Link href="/forgot-password" style={{ color: "var(--accent2)" }}>Request a new one</Link></p>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 20 }}>Choose a new password</p>
            <div className="field"><label>New password</label>
              <input type="password" value={pw} onChange={e => setPw(e.target.value)} />
            </div>
            <div className="field"><label>Confirm password</label>
              <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
            </div>
            {err && <div className="err">{err}</div>}
            <button disabled={busy} onClick={submit} style={{ width: "100%" }}>{busy ? "..." : "Reset password"}</button>
          </>
        )}
      </div>
    </div>
  );
}
