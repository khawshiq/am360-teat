"use client";

// A dashboard KPI tile, in two variants.
//
//   solid — the whole card is a gradient of the tone, text in white. The Academy row.
//   wave  — a WHITE card: the tone lives in the icon chip, the value, and a sparkline
//           along the bottom. The Fees row.
//
// The split is not decorative. Five saturated cards in a row emphasise nothing, so the
// money tiles stay white and let the coloured row above them lead. And a white card is
// the only place a tone can be the VALUE's colour, which is what makes "₹0 overdue"
// read as red money rather than as a red box.
//
// The `tone` says what KIND of number this is:
//   blue / violet / cyan / magenta  → IDENTITY. Which thing (Students, Trainers,
//     Branches, Classes)? Validated colourblind-separable against each other and
//     against the status hues.
//   good / warn / crit              → STATUS. How is this doing? Reserved — never use
//     one for identity, or a red tile stops meaning "something is wrong".
//   slate                           → no data yet. Not a status; an absence.
//
// Every tile carries an icon AND a text label. That is load-bearing, not polish: the
// blue and violet tiles sit at ΔE 11.8 under deuteranopia, which the palette rules
// allow ONLY when colour is not the sole channel. Do not ship a tile without a label.

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

export type Tone = "blue" | "violet" | "cyan" | "magenta" | "good" | "warn" | "crit" | "slate";

export default function StatTile({
  tone, icon, value, label, sub, meter, wave = false, onClick,
}: {
  tone: Tone;
  icon: keyof typeof ICONS;
  value: React.ReactNode;
  label: string;
  /** The quiet line under the label — "5 this month", "0 scheduled". Context, not
   *  a second number competing with the first. */
  sub?: string;
  /** 0–100. A track+fill under the value, for a rate rather than a count. */
  meter?: number;
  /** White card + coloured chip + sparkline, instead of a gradient fill. */
  wave?: boolean;
  /** Makes the tile a button that drills into the rows behind the number. */
  onClick?: () => void;
}) {
  const cls = `stat t-${tone} ${wave ? "wave" : "solid"}`;

  const inner = (
    <>
      <span className="stat-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
      </span>
      <div className="n">{value}</div>
      <div className="l">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {meter !== undefined && (
        <div className="meter" role="progressbar" aria-valuenow={Math.round(meter)}
             aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <div className="meter-fill" style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
        </div>
      )}
      {wave && <Wave id={icon} />}
    </>
  );

  if (!onClick) return <div className={cls}>{inner}</div>;

  return (
    <button type="button" className={`${cls} stat-btn`} onClick={onClick}
            aria-label={`${label} — show details`}>
      {inner}
      <span className="stat-go" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
      </span>
    </button>
  );
}

// The sparkline along the bottom of a money tile. It is DECORATION, and honest about
// it: a real trend line would need a real series, and the dashboard endpoint returns a
// total, not a history. So this is a fixed curve — the same shape on every tile — and
// it is aria-hidden. If a trend series ever lands, feed it in here; until then, do not
// let it imply a movement nobody measured.
function Wave({ id }: { id: string }) {
  const gid = `wave-${id}`;
  const d = "M0,34 C28,16 52,44 84,30 C118,15 146,40 175,24 L200,18";
  return (
    <span className="stat-wave" aria-hidden="true">
      <svg viewBox="0 0 200 52" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.30" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={`${d} L200,52 L0,52 Z`} fill={`url(#${gid})`} />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" opacity="0.75" />
      </svg>
    </span>
  );
}
