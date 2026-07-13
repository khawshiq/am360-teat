import { todayStr } from "./api";

export type FeeStatus = "paid" | "overdue" | "pending";

type FeeLike = {
  amount: number;
  paid_amount: number;
  due_date?: string | null;
  month?: string | null;
};

// The last day of a "YYYY-MM" month. Day 0 of the next month is the last day of
// this one. Used as the implicit due date for a fee that was created without an
// explicit one — which is every fee predating due-date support.
export function endOfMonth(month: string | null | undefined): string | null {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

export const feeDueDate = (fee: FeeLike): string | null => fee.due_date || endOfMonth(fee.month);

// A fee's status is a pure function of what's still owed and when it was due, so we
// DERIVE it on read instead of relying on a scheduled job to flip rows overnight
// (there is no cron here). Write paths store the same value so the column is correct
// at write time, but only the passage of time turns pending -> overdue — so always
// read a fee's status through this, never straight off the column.
export function feeStatus(fee: FeeLike, today = todayStr()): FeeStatus {
  if (fee.paid_amount >= fee.amount) return "paid";
  const due = feeDueDate(fee);
  if (due && due < today) return "overdue";
  return "pending";
}

// Return the row as the API should present it: stored fields, derived status.
export function withFeeStatus<T extends FeeLike>(fee: T, today = todayStr()): T & { status: FeeStatus; due_date: string | null } {
  return { ...fee, due_date: feeDueDate(fee), status: feeStatus(fee, today) };
}
