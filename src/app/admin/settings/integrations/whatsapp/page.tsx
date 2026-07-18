"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

const emptyForm = { businessAccountId: "", phoneNumberId: "", accessToken: "", verifyToken: "", webhookSecret: "" };

const STATUS_LABEL: Record<string, string> = {
  connected: "Connected", disconnected: "Not connected", invalid: "Invalid", expired: "Expired",
};
const STATUS_BADGE: Record<string, string> = {
  connected: "active", disconnected: "inactive", invalid: "overdue", expired: "overdue",
};

export default function WhatsAppIntegrationSettings() {
  const [status, setStatus] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => api.getWhatsAppIntegration().then(setStatus).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  const set = (k: keyof typeof emptyForm) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));

  const connect = async () => {
    setErr(""); setMsg(""); setBusy(true);
    try {
      await api.connectWhatsApp(form);
      setMsg("Saved. Run Test Connection to verify Meta accepts these credentials.");
      setForm(emptyForm); setShowForm(false); load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const test = async () => {
    setErr(""); setMsg(""); setBusy(true);
    try {
      const r = await api.testWhatsAppConnection();
      setMsg(`Connection OK — ${r.business_name || "verified"}${r.phone_number ? ` (${r.phone_number})` : ""}.`);
      load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect WhatsApp for this academy? Sending will stop until you reconnect.")) return;
    setErr(""); setMsg(""); setBusy(true);
    try { await api.disconnectWhatsApp(); setMsg("Disconnected."); load(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const canSave = !!form.businessAccountId.trim() && !!form.phoneNumberId.trim() && form.accessToken.trim().length >= 20;
  const connected = status?.connected;

  return (
    <div className="split wide">
      <div className="card">
        <div className="section-title">WhatsApp Business connection</div>
        {!status ? <div className="muted">Loading…</div> : (
          <div>
            <div className="field">
              <label>Connection status</label>
              <span className={`badge ${STATUS_BADGE[status.status] || "inactive"}`}>{STATUS_LABEL[status.status] || "Not connected"}</span>
            </div>
            {status.business_name ? <div className="field"><label>Business name</label><div>{status.business_name}</div></div> : null}
            {status.display_phone_number ? <div className="field"><label>WhatsApp number</label><div>{status.display_phone_number}</div></div> : null}
            {status.connected_at ? <div className="field"><label>Connected</label><div>{status.connected_at.replace("T", " ").slice(0, 16)}</div></div> : null}

            {err && <div className="err">{err}</div>}
            {msg && <div style={{ color: "var(--ok)", fontSize: 14 }}>{msg}</div>}

            <div className="row" style={{ marginTop: 10 }}>
              {!connected && <button onClick={() => setShowForm(true)}>Connect</button>}
              {connected && <button className="secondary" onClick={() => setShowForm(s => !s)}>Update credentials</button>}
              {connected && <button className="secondary" onClick={test} disabled={busy}>Test connection</button>}
              {connected && <button className="danger" onClick={disconnect} disabled={busy}>Disconnect</button>}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="section-title">{connected ? "Update credentials" : "Connect WhatsApp Business"}</div>
          <div>
            <div className="field"><label>Business Account ID</label><input value={form.businessAccountId} onChange={set("businessAccountId")} /></div>
            <div className="field"><label>Phone Number ID</label><input value={form.phoneNumberId} onChange={set("phoneNumberId")} /></div>
            <div className="field"><label>Permanent Access Token</label><input type="password" value={form.accessToken} onChange={set("accessToken")} /></div>
            <div className="field"><label>Verify Token (optional)</label><input value={form.verifyToken} onChange={set("verifyToken")} /></div>
            <div className="field"><label>Webhook Secret (optional)</label><input value={form.webhookSecret} onChange={set("webhookSecret")} /></div>
            <div className="row">
              <button onClick={connect} disabled={!canSave || busy}>{busy ? "Saving…" : "Save & connect"}</button>
              <button className="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
