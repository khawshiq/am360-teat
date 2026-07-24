"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import WhatsAppMark from "@/components/WhatsAppMark";
import BirthdayWishesCard from "@/components/BirthdayWishesCard";

const MAX_LEN = 1000;
const RECIPIENT_LABELS: Record<string, string> = {
  PARENTS: "Parents only", STUDENTS: "Students only", BOTH: "Parents and students",
};

export default function WhatsAppNotifications() {
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState("");
  const [recipientType, setRecipientType] = useState<"PARENTS" | "STUDENTS" | "BOTH">("PARENTS");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => { api.listBranches().then(setBranches).catch(e => setErr(e.message)); }, []);

  const branch = branches.find(b => b.id === branchId);
  const canSend = !!branchId && !!message.trim() && message.length <= MAX_LEN;

  const send = async () => {
    if (!canSend) return;
    if (!confirm("Are you sure you want to send this WhatsApp message to all selected recipients in this branch?")) return;
    setSending(true); setErr(""); setResult(null);
    try {
      const r = await api.sendWhatsApp({ branchId, recipientType, message: message.trim() });
      setResult(r);
      setMessage("");
    } catch (e: any) { setErr(e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="split sidebar">
      <div className="card" style={{ borderLeft: "3px solid #25D366" }}>
        <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 2 }}>
          <WhatsAppMark />
          <div className="section-title" style={{ marginBottom: 0 }}>Send WhatsApp message</div>
        </div>
        <div>
          <div className="field">
            <label>Branch</label>
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setResult(null); }}>
              <option value="">Select branch…</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Recipients</label>
            <div className="row" style={{ gap: 16 }}>
              {(["PARENTS", "STUDENTS", "BOTH"] as const).map(t => (
                <label key={t} className="row" style={{ gap: 6, fontWeight: 400 }}>
                  <input type="radio" name="recipientType" value={t}
                         checked={recipientType === t}
                         onChange={() => setRecipientType(t)} />
                  {RECIPIENT_LABELS[t]}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Message</label>
            <textarea rows={5} maxLength={MAX_LEN} value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="e.g. Tomorrow is a holiday." />
            <div className="muted" style={{ fontSize: 12.5, textAlign: "right", marginTop: 4 }}>
              {message.length} / {MAX_LEN}
            </div>
          </div>

          {err && <div className="err">{err}</div>}

          {result && (
            <div className="auth-note" style={{ marginTop: 4 }}>
              ✅ Message sent successfully — <b>{result.successCount}</b> delivered, <b>{result.failedCount}</b> failed.{" "}
              <Link href="/admin/notifications/history" className="link">View history</Link>
            </div>
          )}

          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={send} disabled={!canSend || sending}>{sending ? "Sending…" : "Send message"}</button>
            <Link href="/admin/notifications/history"><button type="button" className="secondary">View history</button></Link>
          </div>
        </div>
      </div>

      <div style={{ alignSelf: "start", display: "grid", gap: 16 }}>
      <div className="card" style={{ borderLeft: "3px solid #25D366" }}>
        <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 2 }}>
          <WhatsAppMark size={30} />
          <div className="section-title" style={{ marginBottom: 0 }}>Preview</div>
        </div>
        <div>
          <div className="field">
            <label>Selected branch</label>
            <div>{branch?.name || <span className="muted">None selected</span>}</div>
          </div>
          <div className="field">
            <label>Recipients</label>
            <div>{RECIPIENT_LABELS[recipientType]}</div>
          </div>
          <div className="field">
            <label>Message preview</label>
            <div className="card" style={{ background: "var(--surface-2)", padding: 12, minHeight: 60, whiteSpace: "pre-wrap" }}>
              {message.trim() || <span className="muted">Nothing typed yet.</span>}
            </div>
          </div>
        </div>
      </div>

      <BirthdayWishesCard />
      </div>
    </div>
  );
}
