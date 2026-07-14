// Display formatting for the day-stamps we store as strings. Day-month-year, because that
// is how everyone here reads a date, and "2026-07-13" next to "2026-08-20" is a puzzle.
//
// This is string surgery on purpose. `new Date("2026-07-13").toLocaleDateString()` parses
// the stamp as UTC midnight and then renders it in the viewer's timezone, which shows the
// 12th to anyone west of London. A stored day-stamp has no timezone; don't give it one.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-07-13" (or an ISO timestamp) -> "13 Jul 2026". Anything else -> "—".
export function fmtDay(d: string | null | undefined): string {
  if (typeof d !== "string") return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return "—";
  const [, y, mo, day] = m;
  const name = MONTHS[Number(mo) - 1];
  if (!name) return "—";
  return `${Number(day)} ${name} ${y}`;
}

// "2026-07" -> "Jul 2026". Also accepts a full day-stamp and ignores the day.
export function fmtMonth(m: string | null | undefined): string {
  if (typeof m !== "string") return "—";
  const mt = /^(\d{4})-(\d{2})/.exec(m);
  if (!mt) return "—";
  const name = MONTHS[Number(mt[2]) - 1];
  return name ? `${name} ${mt[1]}` : "—";
}
