"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

// Listens for the global "am360:plan-limit" event (fired by the API client on any
// 402 PLAN_LIMIT response) and shows a single upgrade prompt. Mount once, high in the tree.
export default function UpgradeModal() {
  const [info, setInfo] = useState<{ resource?: string; limit?: number; feature?: string; message?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: Event) => setInfo((e as CustomEvent).detail || {});
    window.addEventListener("am360:plan-limit", handler);
    return () => window.removeEventListener("am360:plan-limit", handler);
  }, []);

  if (!info) return null;
  return (
    <Modal title="Upgrade required" onClose={() => setInfo(null)}>
      <p style={{ margin: "0 0 8px" }}>
        {info.message || "You've reached your plan's limit."}
      </p>
      {/* Two different paywalls arrive on the same 402: a numeric cap (`resource`) and a
          missing feature (`feature`). "Capped at 5 export" would be nonsense, so say the
          right thing for each. */}
      <p className="muted" style={{ fontSize: 13, margin: "0 0 16px" }}>
        {info.feature
          ? "Paid plans include Excel and PDF exports, reports and more. CSV export stays available on every plan."
          : `${info.resource ? `Free plan is capped at ${info.limit} ${info.resource}. ` : ""}Upgrade to Premium for unlimited students, trainers, courses and branches.`}
      </p>
      <div className="row">
        <button onClick={() => { setInfo(null); router.push("/admin/settings"); }}>View plans</button>
        <button className="secondary" onClick={() => setInfo(null)}>Not now</button>
      </div>
    </Modal>
  );
}
