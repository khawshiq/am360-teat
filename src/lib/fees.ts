// Fee dates and status. Deliberately dependency-free — no imports from ./api, which
// would drag Prisma/bcrypt/next-server into the client bundle. Both the API routes and
// the browser import this, so the two can never disagree about when a fee is due.

export type FeeStatus = "paid" | "overdue" | "pending";

const today0 = () => new Date().toISOString().slice(0, 10);

type FeeLike = {
  amount: number;
  paid_amount: number;
  due_date?: string | null;
  month?: string | null;
};

type StudentLike = {
  admission_date?: string | null;
  join_date?: string | null;
};

const isMonth = (m: unknown): m is string => typeof m === "string" && /^\d{4}-\d{2}$/.test(m);
const isDate = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

// The last day of a "YYYY-MM" month. Day 0 of the next month is the last day of this one.
export function endOfMonth(month: string | null | undefined): string | null {
  if (!isMonth(month)) return null;
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

// "2026-12" -> "2027-01"
export function nextMonth(month: string | null | undefined): string | null {
  if (!isMonth(month)) return null;
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

// The day of the month a student's billing cycle falls on: the day they were admitted.
// Falls back to their join date. Null when we know neither.
export function billingAnchorDay(student: StudentLike | null | undefined): number | null {
  const d = student?.admission_date || student?.join_date;
  if (!isDate(d)) return null;
  const day = Number(d.slice(8, 10));
  return day >= 1 && day <= 31 ? day : null;
}

// The due date inside `month` for a cycle anchored on `anchorDay`, clamped to the length
// of that month — a student admitted on the 31st bills on the 28th in February, not on a
// date that doesn't exist. With no anchor we fall back to the end of the month.
export function dueDateFor(month: string | null | undefined, anchorDay: number | null): string | null {
  const eom = endOfMonth(month);
  if (!eom || !anchorDay) return eom;
  const lastDay = Number(eom.slice(8, 10));
  const day = Math.min(anchorDay, lastDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}

// Legacy rows carry no due_date; fall back to the end of their month so they still grade.
export const feeDueDate = (fee: FeeLike): string | null => fee.due_date || endOfMonth(fee.month);

// A fee's status is a pure function of what's still owed and when it was due, so we
// DERIVE it on read instead of relying on a scheduled job to flip rows overnight (there
// is no cron here). Write paths store the same value so the column is correct at write
// time, but only the passage of time turns pending -> overdue — so always read a fee's
// status through this, never straight off the column.
export function feeStatus(fee: FeeLike, today = today0()): FeeStatus {
  if (fee.paid_amount >= fee.amount) return "paid";
  const due = feeDueDate(fee);
  if (due && due < today) return "overdue";
  return "pending";
}

// Return the row as the API should present it: stored fields, derived status + due date.
export function withFeeStatus<T extends FeeLike>(fee: T, today = today0()): T & { status: FeeStatus; due_date: string | null } {
  return { ...fee, due_date: feeDueDate(fee), status: feeStatus(fee, today) };
}

// When a student owes nothing, the useful answer is not "nothing owed" but *when they
// next pay*. That is the billing anniversary of their admission date, in the month after
// the last one they've been billed for (or this month, if they've never been billed).
export function upcomingDueDate(
  student: StudentLike | null | undefined,
  billedMonths: (string | null | undefined)[],
  today = today0(),
): string | null {
  const months = billedMonths.filter(isMonth);
  const latest = months.length ? months.reduce((a, b) => (b > a ? b : a)) : null;
  const month = latest ? nextMonth(latest) : today.slice(0, 7);
  return dueDateFor(month, billingAnchorDay(student));
}
