"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useAuth } from "@/context/auth";

export default function ChangePassword() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [cur, setCur] = useState(""); const [nw, setNw] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      await api.changePassword({ current_password: cur, new_password: nw });
      const role = user?.role;
      await refreshUser();
      router.replace(role === "trainer" ? "/trainer" : "/admin");
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="center">
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div className="brand">AM <span>360</span></div>
        <p className="muted" style={{ marginBottom: 20 }}>Set a new password</p>
        <div className="field"><label>Current / temporary password</label><input type="password" value={cur} onChange={e => setCur(e.target.value)} /></div>
        <div className="field"><label>New password</label><input type="password" value={nw} onChange={e => setNw(e.target.value)} /></div>
        {err && <div className="err">{err}</div>}
        <button disabled={busy || !cur || nw.length < 6} onClick={submit} style={{ width: "100%" }}>{busy ? "..." : "Update password"}</button>
      </div>
    </div>
  );
}
