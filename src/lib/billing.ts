import { createHash } from "crypto";
import { prisma } from "./prisma";
import { addMonths, billingAnchorDay, billingStartMonth, dueDateFor, feeStatusFor, nextMonth } from "./fees";

// Monthly fee accrual — the thing that turns "this student owes money" into a row.
//
// Everything ELSE about a fee is derived at read time (src/lib/fees.ts): its due date is
// the student's joining-day anniversary, its status is a pure function of what is owed and
// what day it is. But a status cannot be derived from a row that was never written, and
// nothing wrote one: a fee only existed if an admin clicked "Create" on the fees tab, for
// that student, that month. So an academy that never clicked it had a permanently empty
// Overdue tile — not because the maths was wrong, but because there was nothing to grade.
//
// There is no cron here (and on Vercel a cron is a paid, separately-deployed thing), so
// accrual runs LAZILY on the paths that need it: when a student joins, and whenever the
// dashboard or the fees tab is read. It is idempotent — re-running it changes nothing —
// so how often it runs does not matter.
//
// The rule, in one line: from the month a student is first billed, one `monthly` fee per
// month up to the current one, at their `monthly_fee`, due on their joining-day anniversary.

// How far back a single run will reach. A student whose last raised fee is years old is not
// carrying years of hidden debt we get to invent — we bill the last year and move on. Never
// billed at all? They start this month (see firstAccrualMonth). Both bounds exist so that
// switching this on cannot detonate an existing academy's books.
const MAX_CATCHUP_MONTHS = 12;

const todayStr = () => new Date().toISOString().slice(0, 10);

// A deterministic, UUID-shaped id per (student, month). Two dashboard loads racing each
// other therefore collide on the primary key and `skipDuplicates` drops the loser, instead
// of billing the student twice. This is the only reason the id is not a random uuid.
function accrualId(student_id: string, month: string): string {
  const h = createHash("sha1").update(`am360:fee:${student_id}:${month}:monthly`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// The first month this student should be billed for.
//
// Already billed → carry on from the month after their last one, so a gap becomes an unpaid
// fee and then an overdue one. That is the "missed a fee" half of the requirement.
//
// Never billed → start THIS month, not at their admission date. Back-filling to admission
// would hand an academy that has been running for three years a screen full of overdue fees
// it never charged and nobody owes. Their history stays as it is; their billing starts now.
function firstAccrualMonth(
  student: { admission_date?: string | null; join_date?: string | null },
  billedMonths: Set<string> | undefined,
  thisMonth: string,
): string | null {
  if (billedMonths?.size) {
    const latest = [...billedMonths].reduce((a, b) => (b > a ? b : a));
    const from = nextMonth(latest);
    const floor = addMonths(thisMonth, -(MAX_CATCHUP_MONTHS - 1));
    if (!from) return null;
    return floor && from < floor ? floor : from;
  }
  const start = billingStartMonth(student);
  // A student admitted in the future (pre-registration) starts billing then, not now.
  return start && start > thisMonth ? start : thisMonth;
}

/**
 * Raise every monthly fee an academy's active students are due but do not have yet.
 *
 * Scoped by `academy_id` from the caller's JWT, like every other tenant query. Pass
 * `studentIds` to accrue for specific students only (the student-create path does this so a
 * new joiner's first fee exists before the response comes back). Returns how many rows were
 * created.
 */
export async function accrueFees(
  academy_id: string,
  today = todayStr(),
  opts: { studentIds?: string[]; actor?: { id: string; name: string } } = {},
): Promise<number> {
  // Clamped to the real calendar month, never past it. `today` is injectable so the
  // read paths can pass the date they already computed — but a caller that accidentally
  // threads a query param through here must not be able to bill a student into 2030.
  const thisMonth = [today.slice(0, 7), todayStr().slice(0, 7)].sort()[0];

  // monthly_fee <= 0 means "this student is not billed monthly" — free seat, sibling on a
  // one-off admission fee, trial. Raising a ₹0 fee would only add noise to the fees tab.
  const students = await prisma.student.findMany({
    where: {
      academy_id, status: "active", monthly_fee: { gt: 0 },
      ...(opts.studentIds ? { id: { in: opts.studentIds } } : {}),
    },
    select: { id: true, monthly_fee: true, admission_date: true, join_date: true },
  });
  if (!students.length) return 0;

  const existing = await prisma.fee.findMany({
    where: { academy_id, type: "monthly", student_id: { in: students.map(s => s.id) } },
    select: { student_id: true, month: true },
  });
  const billed = new Map<string, Set<string>>();
  for (const f of existing) {
    let set = billed.get(f.student_id);
    if (!set) billed.set(f.student_id, (set = new Set()));
    set.add(f.month);
  }

  const created_at = new Date().toISOString();
  const rows: any[] = [];
  for (const s of students) {
    const months = billed.get(s.id);
    let m = firstAccrualMonth(s, months, thisMonth);
    for (; m && m <= thisMonth; m = nextMonth(m)) {
      if (months?.has(m)) continue;
      const due_date = dueDateFor(m, billingAnchorDay(s));
      rows.push({
        id: accrualId(s.id, m),
        academy_id, student_id: s.id, type: "monthly",
        amount: s.monthly_fee, paid_amount: 0, month: m, due_date,
        // The column is a cache the read paths overrule anyway (invariant 10), but writing
        // the right value keeps a freshly-raised arrear correct even to a raw query.
        status: feeStatusFor({ amount: s.monthly_fee, paid_amount: 0, due_date, month: m }, s, today),
        note: "Auto-raised monthly fee",
        created_at,
      });
    }
  }
  if (!rows.length) return 0;

  const res = await prisma.fee.createMany({ data: rows, skipDuplicates: true });
  if (res.count) {
    // Money appeared on the owner's dashboard without anyone pressing a button, so it is
    // accounted for. Written directly rather than through audit() because the actor is the
    // system on the read paths, and there is no user to attribute it to.
    await prisma.auditLog.create({ data: {
      academy_id,
      actor_id: opts.actor?.id || "system",
      actor_name: opts.actor ? `${opts.actor.name} (auto-billing)` : "Auto-billing",
      action: "fee.accrue", entity: "fee", entity_id: "*",
      meta: { count: res.count, through: thisMonth }, created_at,
    } }).catch(() => {});
  }
  return res.count;
}

/**
 * `accrueFees` for a read path: never throws, never blocks the screen. A dashboard that
 * cannot raise a fee should still render the numbers it already has.
 */
export const accrueFeesSafely = (
  academy_id: string,
  today?: string,
  opts?: { studentIds?: string[]; actor?: { id: string; name: string } },
): Promise<number> => accrueFees(academy_id, today, opts).catch(() => 0);
