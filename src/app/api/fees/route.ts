export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, adminAuth, json, fail, nowIso, trainerBranchIds } from "@/lib/api";
import { endOfMonth, feeStatus, withFeeStatus } from "@/lib/fees";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const branch_id = new URL(req.url).searchParams.get("branch_id");
  const where: any = { academy_id: u.academy_id };
  const scope = async (branchWhere: any) => {
    const ids = (await prisma.student.findMany({ where: { academy_id: u.academy_id, ...branchWhere }, select: { id: true } })).map((s: any) => s.id);
    where.student_id = { in: ids };
  };
  if (u.role === "trainer") await scope({ branch_id: { in: trainerBranchIds(u) } });
  else if (branch_id) await scope({ branch_id });
  const fees = await prisma.fee.findMany({ where, include: { payments: true } });
  // Status is derived, not trusted from the column — a fee goes overdue by the clock,
  // and nothing writes to the row when that happens. See src/lib/fees.ts.
  return json(fees.map(f => withFeeStatus(f)));
}
export async function POST(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  if (!(await prisma.student.findFirst({ where: { id: b.student_id, academy_id: a.user.academy_id } }))) return fail(404, "Student not found");
  // Default the due date to the end of the fee's month, so a fee always has one to
  // fall overdue against. Without this the whole overdue path is dead code.
  const due_date = b.due_date || endOfMonth(b.month);
  const fee = await prisma.fee.create({ data: {
    academy_id: a.user.academy_id, student_id: b.student_id, type: b.type || "monthly", amount: b.amount,
    paid_amount: 0, month: b.month, due_date, note: b.note || "", created_at: nowIso(),
    status: feeStatus({ amount: b.amount, paid_amount: 0, due_date, month: b.month }),
  } });
  await audit(a.user, "fee.create", "fee", fee.id, { amount: fee.amount, type: fee.type });
  return json(withFeeStatus(fee));
}
