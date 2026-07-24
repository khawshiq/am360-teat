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

// "2026-07" + n months, n may be negative. Used to bound how far back accrual will
// reach — see src/lib/billing.ts.
export function addMonths(month: string | null | undefined, n: number): string | null {
  if (!isMonth(month)) return null;
  const [y, m] = month.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  const yy = Math.floor(t / 12);
  return `${String(yy).padStart(4, "0")}-${String(t - yy * 12 + 1).padStart(2, "0")}`;
}

// The month a student's billing starts: the month they joined. Their admission date is
// the anchor, their join date the fallback — the same precedence as billingAnchorDay,
// so the month and the day-of-month can never come from two different fields.
export function billingStartMonth(student: StudentLike | null | undefined): string | null {
  const d = student?.admission_date || student?.join_date;
  return isDate(d) ? d.slice(0, 7) : null;
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

// THE due date of a fee: the student's billing anniversary inside that fee's month.
//
// The `due_date` column is a cache, not the truth. Rows written before the anchoring rule
// existed carry an end-of-month date (or none), so a student admitted on the 20th would see
// "due 31 Jul" on the fee and "next due 20 Aug" underneath it — the same cycle, dated two
// different ways. The anchor is the one rule; the column is only the fallback for a student
// whose admission and join dates we don't have.
export function anchoredDueDate(fee: FeeLike, student: StudentLike | null | undefined): string | null {
  const anchor = billingAnchorDay(student);
  return (anchor ? dueDateFor(fee.month, anchor) : null) || feeDueDate(fee);
}

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

// A fee's status, graded against its anchored due date rather than whatever the column says.
export function feeStatusFor(fee: FeeLike, student: StudentLike | null | undefined, today = today0()): FeeStatus {
  return feeStatus({ ...fee, due_date: anchoredDueDate(fee, student) }, today);
}

// Return the row as the API should present it: stored fields, derived status + due date.
// Pass the student and both come out anchored on their admission day; without one it degrades
// to the stored/end-of-month date, which is the best we can do for a student with no dates.
export function withFeeStatus<T extends FeeLike>(
  fee: T,
  student?: StudentLike | null,
  today = today0(),
): T & { status: FeeStatus; due_date: string | null } {
  const due_date = anchoredDueDate(fee, student);
  return { ...fee, due_date, status: feeStatus({ ...fee, due_date }, today) };
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
