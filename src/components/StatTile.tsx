"use client";

// A dashboard KPI tile: colour on a left edge and an icon chip, value in ink.
//
// The `tone` is not decoration — it says what KIND of number this is:
//   blue / violet / cyan / magenta  → IDENTITY. Which thing is this (Students,
//     Trainers, Branches, Classes)? Four hues, validated as colourblind-separable
//     against each other AND against the status colours.
//   good / warn / crit              → STATUS. How is this doing (Collected,
//     Pending, Overdue)? Reserved — never use one for identity, or a red tile
//     stops meaning "something is wrong".
// See the tokens in globals.css.

const ICONS: Record<string, JSX.Element> = {
  students: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M17 8.2A2.8 2.8 0 0 1 17 13" /><path d="M18 20a5.6 5.6 0 0 0-2-4.3" /></>,
  trainers: <><path d="M12 3l9 4.5-9 4.5-9-4.5z" /><path d="M7 10v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V10" /></>,
  branches: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M10 21v-6h4v6" /></>,
  attendance: <><path d="M20 6L9 17l-5-5" /></>,
  classes: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4M16 3v4" /></>,
  collected: <><circle cx="12" cy="12" r="9" /><path d="M9 8h6M9 11h6M14.5 8c0 3-2 3.4-4.5 3.4L14 16" /></>,
  pending: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></>,
  overdue: <><path d="M12 3.5L21 19H3z" /><path d="M12 10v3.5" /><path d="M12 16.6v.01" /></>,
  month: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
};

export type Tone = "blue" | "violet" | "cyan" | "magenta" | "good" | "warn" | "crit";

export default function StatTile({
  tone, icon, value, label, alarm = false, meter,
}: {
  tone: Tone;
  icon: keyof typeof ICONS;
  value: React.ReactNode;
  label: string;
  /** Overdue money only: paint the value red. It keeps its icon and its label, so
   *  it is never colour-alone. */
  alarm?: boolean;
  /** 0–100. Renders a track+fill under the value, for a rate rather than a count. */
  meter?: number;
}) {
  return (
    <div className={`stat t-${tone}`}>
      <span className="stat-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
      </span>
      <div className={alarm ? "n alarm" : "n"}>{value}</div>
      <div className="l">{label}</div>
      {meter !== undefined && (
        <div className="meter" role="progressbar" aria-valuenow={Math.round(meter)}
             aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <div className="meter-fill" style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
        </div>
      )}
    </div>
  );
}
