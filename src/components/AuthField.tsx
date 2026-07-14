"use client";
import { useState } from "react";

// A labelled input with a leading icon chip, and — on a password — an eye that
// reveals it. Auth screens only; see the note in globals.css for why this is opt-in
// rather than a restyle of every input in the app.
//
// The eye matters more than it looks. A password field you cannot read back is where
// typos on a phone keyboard go to hide, and "wrong password" is the least helpful
// error we ship. It defaults to hidden and is never persisted.

const ICONS: Record<string, JSX.Element> = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  academy: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M10 21v-6h4v6" /></>,
  phone: <><path d="M6 3h4l2 5-2.5 1.5a12 12 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z" /></>,
};

export default function AuthField({
  label, icon, type = "text", right, value, onChange, onEnter, ...rest
}: {
  label: string;
  icon: keyof typeof ICONS;
  type?: string;
  /** Rendered opposite the label — e.g. the "Forgot?" link. */
  right?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && shown ? "text" : type;

  return (
    <div className="field">
      {right
        ? <div className="field-row"><label>{label}</label>{right}</div>
        : <label>{label}</label>}
      <div className={`input-wrap${isPassword ? " has-eye" : ""}`}>
        <span className="input-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round">
            {ICONS[icon]}
          </svg>
        </span>
        <input
          {...rest}
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && onEnter) onEnter(); }}
        />
        {isPassword && (
          // type="button": inside a <form> a bare <button> submits it, which would
          // fire the login every time someone peeked at their password.
          <button type="button" className="input-eye" onClick={() => setShown(s => !s)}
                  aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
              <circle cx="12" cy="12" r="2.6" />
              {shown && <path d="M4 20L20 4" />}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
