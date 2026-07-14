export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { json, nowIso } from "@/lib/api";
import { superAuth } from "@/lib/superauth";
import { billingAnchorDay, dueDateFor, feeStatus } from "@/lib/fees";

// One-off maintenance: re-anchor existing fees onto the student's admission-day billing
// cycle. Fees created before that rule existed carry an end-of-month due_date (or none at
// all), which is a date nobody agreed to.
//
// Runs preview-first: POST {} reports what WOULD change and writes nothing. Only
// POST { apply: true } commits. Super Admin only — it spans every academy.
//
// Safe to re-run: it is idempotent (a fee already on the right date is skipped), and it
// never changes a PAID fee's status, since paid_amount >= amount outranks any due date.
export async function POST(req: Request) {
  const a = await superAuth(req); if (a.error) return a.error;
  const { apply = false } = await req.json().catch(() => ({}));

  const [fees, students] = await Promise.all([
    prisma.fee.findMany(),
    prisma.student.findMany({ select: { id: true, name: true, admission_date: true, join_date: true } }),
  ]);
  const byId = new Map(students.map(s => [s.id, s]));

  const changes: { id: string; academy_id: string; student: string; month: string; from: string | null; to: string; status: string; was: string }[] = [];
  let orphaned = 0, unchanged = 0;

  for (const f of fees) {
    const s = byId.get(f.student_id);
    if (!s) { orphaned++; continue; }                       // student deleted; fee is unreachable anyway
    const to = dueDateFor(f.month, billingAnchorDay(s));
    if (!to || to === f.due_date) { unchanged++; continue; }
    changes.push({
      id: f.id, academy_id: f.academy_id, student: s.name, month: f.month,
      from: f.due_date, to,
      was: feeStatus(f),
      status: feeStatus({ ...f, due_date: to }),
    });
  }

  const newly_overdue = changes.filter(c => c.was !== "overdue" && c.status === "overdue").length;
  const no_longer_overdue = changes.filter(c => c.was === "overdue" && c.status !== "overdue").length;

  if (apply && changes.length) {
    // Chunked so a large backfill doesn't open one enormous transaction.
    const CHUNK = 50;
    for (let i = 0; i < changes.length; i += CHUNK) {
      await prisma.$transaction(
        changes.slice(i, i + CHUNK).map(c =>
          prisma.fee.update({ where: { id: c.id }, data: { due_date: c.to, status: c.status } }),
        ),
      );
    }
    // One audit row per affected academy, so each owner can see it happened to their data.
    const perAcademy = new Map<string, number>();
    for (const c of changes) perAcademy.set(c.academy_id, (perAcademy.get(c.academy_id) || 0) + 1);
    for (const [academy_id, count] of perAcademy) {
      await prisma.auditLog.create({ data: {
        academy_id, actor_id: a.user.id, actor_name: `${a.user.name} (super admin)`,
        action: "fee.due_date_backfill", entity: "fee", entity_id: "*",
        meta: { count }, created_at: nowIso(),
      } }).catch(() => {});
    }
  }

  return json({
    applied: !!apply,
    scanned: fees.length,
    would_change: changes.length,
    unchanged,
    orphaned,
    newly_overdue,
    no_longer_overdue,
    sample: changes.slice(0, 20),
  });
}
