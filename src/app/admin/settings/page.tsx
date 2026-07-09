"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useImageUpload } from "@/lib/useImageUpload";
import { cld } from "@/lib/cloudinary";
import SubscriptionModal from "@/components/SubscriptionModal";

const PLAN_LABELS: Record<string, string> = { free: "Free", basic: "Basic", pro: "Pro", premium: "Pro", enterprise: "Enterprise" };

export default function Settings() {
  const [form, setForm] = useState<any>({ name: "", description: "", logo_url: null });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [showPlans, setShowPlans] = useState(false);
  const [subMsg, setSubMsg] = useState("");
  const { uploading: up, onFileChange } = useImageUpload("am360/logos");
  const loadAcademy = () => api.getAcademy().then(setForm).catch(e => setErr(e.message));
  useEffect(() => { loadAcademy(); }, []);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const onLogo = (e: any) => onFileChange(e, url => setForm((s: any) => ({ ...s, logo_url: url })), setErr);
  const save = async () => {
    setErr(""); setMsg("");
    try {
      // Only the academy profile is editable here. Subscription changes go through
      // the paid purchase flow (Razorpay), never a direct field write.
      await api.updateAcademy({ name: form.name, description: form.description, logo_url: form.logo_url });
      setMsg("Saved.");
    } catch (e: any) { setErr(e.message); }
  };
  const onSubscribed = (r: { plan: string; start: string; end: string }) => {
    setShowPlans(false);
    setSubMsg(`Subscribed to ${PLAN_LABELS[r.plan] || r.plan}. Active ${r.start} → ${r.end}.`);
    loadAcademy();
  };
  const planCode = String(form.subscription_plan || "free").toLowerCase();
  const isPaid = ["basic", "pro", "premium", "enterprise"].includes(planCode);
  const today = new Date().toISOString().slice(0, 10);
  const expired = isPaid && !!form.subscription_expires && form.subscription_expires < today;
  return (
    <div className="split wide">
      <div className="card">
        <div className="section-title">Academy profile</div>
        <div>
          {form.logo_url ? <img src={cld(form.logo_url, { w: 160, h: 160, crop: "fill", gravity: "auto" })} alt="logo" style={{ width: 80, height: 80, borderRadius: 14, objectFit: "cover", marginBottom: 12 }} /> : null}
          <div className="field"><label>Logo {up && <span className="muted">(uploading…)</span>}</label><input type="file" accept="image/*" onChange={onLogo} /></div>
          <div className="field"><label>Name</label><input value={form.name || ""} onChange={set("name")} /></div>
          <div className="field"><label>Description</label><textarea rows={3} value={form.description || ""} onChange={set("description")} /></div>
          {err && <div className="err">{err}</div>}
          {msg && <div style={{ color: "var(--ok)", fontSize: 14, marginBottom: 8 }}>{msg}</div>}
          <div className="row">
            <button onClick={save}>Save changes</button>
            <Link href="/change-password"><button className="secondary" type="button">Change Password</button></Link>
          </div>
        </div>
      </div>
      <div className="card" style={{ alignSelf: "start" }}>
        <div className="section-title">Subscription</div>
        <div>
          <div className="field">
            <label>Current plan</label>
            <div className="row" style={{ gap: 8 }}>
              <span className={`badge ${isPaid && !expired ? "active" : ""}`}>{PLAN_LABELS[planCode] || "Free"}</span>
              {expired && <span className="badge overdue">expired</span>}
            </div>
          </div>

          {isPaid && form.subscription_started && form.subscription_expires ? (
            expired ? (
              <div className="auth-note" style={{ marginTop: 4 }}>
                Your <b>{PLAN_LABELS[planCode]}</b> plan expired on <b>{form.subscription_expires}</b>. Renew to restore your limits.
              </div>
            ) : (
              <div className="auth-note" style={{ marginTop: 4 }}>
                You are subscribed to <b>{PLAN_LABELS[planCode]}</b> from <b>{form.subscription_started}</b> to <b>{form.subscription_expires}</b>.
              </div>
            )
          ) : isPaid ? (
            <div className="auth-note" style={{ marginTop: 4 }}>You are on the <b>{PLAN_LABELS[planCode]}</b> plan.</div>
          ) : (
            <p className="auth-note" style={{ marginTop: 4 }}>
              Free plan — up to 1 branch, 5 students, 2 trainers and 2 courses. Upgrade to add more.
            </p>
          )}

          {subMsg && <div style={{ color: "var(--ok)", fontSize: 13.5, margin: "12px 0 0" }}>{subMsg}</div>}

          <button onClick={() => setShowPlans(true)} className="btn-block" style={{ marginTop: 14 }}>
            {expired ? "Renew plan" : isPaid ? "Change / renew plan" : "Upgrade plan"}
          </button>
        </div>
      </div>

      {showPlans && (
        <SubscriptionModal currentPlan={planCode} onClose={() => setShowPlans(false)} onSuccess={onSubscribed} />
      )}
    </div>
  );
}
