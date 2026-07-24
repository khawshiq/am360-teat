"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import WhatsAppMark from "./WhatsAppMark";
import { fmtDay } from "@/lib/date";

// Settings for automatic birthday wishes. Lives on the Notifications page rather than in
// Settings because it is a message, and this is where messages are.
//
// The card's job beyond the three inputs: say plainly whether a wish would actually go out
// today. Three separate things have to be true (plan, WhatsApp connected, toggle on), and
// a silent no-op on a student's birthday is not something anyone would think to debug.

const RECIPIENT_LABELS: Record<string, string> = {
  PARENTS: "Parents only", STUDENTS: "Students only", BOTH: "Parents and students",
};

export default function BirthdayWishesCard() {
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [recipientType, setRecipientType] = useState("BOTH");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState("");

  const load = async () => {
    try {
      const d = await api.getBirthdaySettings();
      setS(d); setMsg(d.message); setRecipientType(d.recipient_type);
    } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const save = async (patch: any) => {
    setSaving(true); setErr(""); setSaved("");
    try {
      const d = await api.updateBirthdaySettings({ recipient_type: recipientType, message: msg.trim(), ...patch });
      setS((prev: any) => ({ ...prev, ...d }));
      setSaved(d.enabled ? "Saved — automatic wishes are on." : "Saved.");
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const toggle = () => {
    if (!s.enabled && !confirm("Turn on automatic birthday wishes? AM 360 will send WhatsApp messages to students on their birthday without asking again."))
      return;
    save({ enabled: !s.enabled });
  };

  if (!s) return <div className="card"><p className="muted">{err || "Loading…"}</p></div>;

  const connected = s.whatsapp_status === "connected";
  const blocker = !s.messaging_allowed
    ? "Automatic wishes need the Pro or Enterprise plan."
    : !connected
      ? "Connect your WhatsApp Business account in Settings → Integrations before turning this on."
      : "";

  return (
    <div className="card" style={{ borderLeft: "3px solid #25D366" }}>
      <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 2 }}>
        <WhatsAppMark />
        <div className="section-title" style={{ marginBottom: 0 }}>🎂 Automatic birthday wishes</div>
        <span className={`badge ${s.enabled ? "active" : "inactive"}`} style={{ marginLeft: "auto" }}>
          {s.enabled ? "On" : "Off"}
        </span>
      </div>

      <p className="auth-note" style={{ marginTop: 0 }}>
        Sends one WhatsApp message on each student&apos;s birthday, from your own business number.
        Every student is wished <b>once</b> per birthday — turning this on twice, or opening the
        dashboard ten times, cannot send it again.
      </p>

      {blocker && <div className="auth-note" style={{ color: "var(--warn)" }}>{blocker}</div>}
      {/* The failure nobody would think to check: it works perfectly and nobody has a
          birthday, because nobody has a date of birth on file. */}
      {s.students_with_dob === 0 && s.active_students > 0 && (
        <div className="auth-note" style={{ color: "var(--warn)" }}>
          None of your {s.active_students} active students has a date of birth recorded, so nothing
          will ever send. Add one under each student&apos;s <b>Edit</b> form.
        </div>
      )}
      {s.students_with_dob > 0 && s.students_with_dob < s.active_students && (
        <p className="auth-note" style={{ marginTop: 0 }}>
          {s.students_with_dob} of {s.active_students} active students have a date of birth on file —
          only those can be wished.
        </p>
      )}
      {err && <div className="err">{err}</div>}
      {saved && <div style={{ color: "var(--ok)", fontSize: 13.5, marginBottom: 8 }}>{saved}</div>}

      <div className="field">
        <label>Recipients</label>
        <div className="row" style={{ gap: 16 }}>
          {(["PARENTS", "STUDENTS", "BOTH"] as const).map(t => (
            <label key={t} className="row" style={{ gap: 6, fontWeight: 400 }}>
              <input type="radio" name="birthdayRecipients" value={t}
                     checked={recipientType === t} onChange={() => setRecipientType(t)} />
              {RECIPIENT_LABELS[t]}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Message</label>
        <textarea rows={3} maxLength={s.max_length} value={msg} onChange={e => setMsg(e.target.value)} />
        <div className="row" style={{ justifyContent: "space-between", marginTop: 4 }}>
          <span className="muted" style={{ fontSize: 12.5 }}>
            <code>{"{name}"}</code> becomes the student&apos;s name, <code>{"{academy}"}</code> your academy&apos;s.
          </span>
          <span className="muted" style={{ fontSize: 12.5 }}>{msg.length} / {s.max_length}</span>
        </div>
      </div>

      <div className="field">
        <label>Today ({fmtDay(s.today)})</label>
        {s.today_count === 0
          ? <span className="muted" style={{ fontSize: 13.5 }}>No birthdays today.</span>
          : (
            <div style={{ fontSize: 13.5 }}>
              {s.today_students.map((t: any) => t.name).join(", ")}
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                {s.sent_today > 0 ? `${s.sent_today} wish(es) already sent today.` : "Nothing sent yet today."}
              </div>
            </div>
          )}
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={toggle} disabled={saving || (!s.enabled && !!blocker)} className={s.enabled ? "secondary" : ""}>
          {saving ? "Saving…" : s.enabled ? "Turn off" : "Turn on"}
        </button>
        <button className="secondary" onClick={() => save({})} disabled={saving || !msg.trim()}>Save message</button>
      </div>
    </div>
  );
}
