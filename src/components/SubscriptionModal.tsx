"use client";
import { useEffect, useState } from "react";
import Modal from "./Modal";
import { api } from "@/lib/client";

declare global { interface Window { Razorpay?: any } }

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

// Purchase / upgrade flow. Lists paid plans, lets the owner pick a duration, and
// runs Razorpay checkout. On success it calls onSuccess with the activated period.
export default function SubscriptionModal({
  currentPlan, onClose, onSuccess,
}: {
  currentPlan?: string;
  onClose: () => void;
  onSuccess: (r: { plan: string; start: string; end: string }) => void;
}) {
  const [plans, setPlans] = useState<any[]>([]);
  const [months, setMonths] = useState(12);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api.listPlans()
      .then((all: any[]) => setPlans(all.filter(p => p.code !== "free" && p.price_monthly > 0)))
      .catch(e => setErr(e.message));
  }, []);

  const priceFor = (p: any) => (months === 12 && p.price_yearly > 0 ? p.price_yearly : p.price_monthly * months);

  const buy = async (p: any) => {
    setErr(""); setBusy(p.code);
    try {
      const order = await api.createSubscriptionOrder({ plan_code: p.code, months });
      const ok = await loadRazorpay();
      if (!ok) { setErr("Couldn't load the payment window. Check your connection."); setBusy(""); return; }
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "AM360",
        description: `${order.plan.name} · ${order.months} month${order.months > 1 ? "s" : ""}`,
        order_id: order.order_id,
        theme: { color: "#6c5ce7" },   // keep in step with --accent in globals.css
        handler: async (resp: any) => {
          try {
            const r = await api.verifySubscription({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            onSuccess(r);
          } catch (e: any) { setErr(e.message); setBusy(""); }
        },
        modal: { ondismiss: () => setBusy("") },
      });
      rzp.on("payment.failed", (r: any) => { setErr(r?.error?.description || "Payment failed."); setBusy(""); });
      rzp.open();
    } catch (e: any) { setErr(e.message); setBusy(""); }
  };

  return (
    <Modal title="Choose a plan" onClose={onClose}>
      <div className="field">
        <label>Billing period</label>
        <select value={months} onChange={e => setMonths(parseInt(e.target.value, 10))}>
          {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}{m === 12 ? " (best value)" : ""}</option>)}
        </select>
      </div>

      {err && <div className="err">{err}</div>}
      {!plans.length && !err && <p className="muted">Loading plans…</p>}

      <div className="grid" style={{ gap: 10 }}>
        {plans.map(p => {
          const isCurrent = p.code === currentPlan;
          const lim = (n: number) => (n === -1 ? "Unlimited" : n);
          return (
            <div key={p.code} className="list-item" style={{ alignItems: "flex-start", flexDirection: "column", gap: 8 }}>
              <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>{" "}
                  {isCurrent && <span className="badge active">current</span>}
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {lim(p.max_branches)} branches · {lim(p.max_students)} students · {lim(p.max_trainers)} trainers · {lim(p.max_courses)} courses
                  </div>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{inr(priceFor(p))}</div>
                  <div className="muted" style={{ fontSize: 11 }}>for {months} mo</div>
                </div>
              </div>
              <button disabled={!!busy} onClick={() => buy(p)} className="btn-block">
                {busy === p.code ? "Opening payment…" : isCurrent ? `Renew / extend ${p.name}` : `Subscribe to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Secure payment via Razorpay. Your plan activates immediately after payment.</p>
    </Modal>
  );
}
