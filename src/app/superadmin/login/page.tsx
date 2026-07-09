"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sa, saToken } from "@/lib/saclient";

export default function SuperAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); setBusy(true);
    try { const res = await sa.login({ email, password }); saToken.set(res.access_token); router.push("/superadmin"); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="center">
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div className="brand">AM <span>360</span></div>
        <p className="muted" style={{ marginBottom: 20 }}>Platform Super Admin</p>
        <div className="field"><label>Email</label><input value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} /></div>
        {err && <div className="err">{err}</div>}
        <button disabled={busy} onClick={submit} style={{ width: "100%" }}>{busy ? "..." : "Sign in"}</button>
      </div>
    </div>
  );
}
