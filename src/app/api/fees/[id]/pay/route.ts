export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail, nowIso, todayStr } from "@/lib/api";
import { feeStatusFor, withFeeStatus } from "@/lib/fees";
import { audit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  const fee = await prisma.fee.findFirst({ where: { id: params.id, academy_id: a.user.academy_id } });
  if (!fee) return fail(404, "Fee not found");
  // The student carries the billing anchor, so we need them to grade the fee. See src/lib/fees.ts.
  const student = await prisma.student.findFirst({
    where: { id: fee.student_id, academy_id: a.user.academy_id },
    select: { admission_date: true, join_date: true },
  });
  const amount = Number(b.amount) || 0;
  await prisma.payment.create({ data: {
    academy_id: a.user.academy_id, fee_id: fee.id, student_id: fee.student_id, amount,
    method: b.method || "cash", paid_date: b.paid_date || todayStr(), note: b.note || "", recorded_by: a.user.id, created_at: nowIso(),
  } });
  // A part-payment of a fee that is already past due stays overdue — it does not
  // fall back to "pending" just because money moved.
  const paid_amount = fee.paid_amount + amount;
  const status = feeStatusFor({ ...fee, paid_amount }, student);
  await prisma.fee.update({ where: { id: fee.id }, data: { paid_amount, status } });
  await audit(a.user, "fee.pay", "fee", fee.id, { amount, method: b.method });
  const updated = await prisma.fee.findUnique({
    where: { id: fee.id },
    include: { payments: { orderBy: { paid_date: "desc" } } },
  });
  return json(updated ? withFeeStatus(updated, student) : null);
}
