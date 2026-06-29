export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail, nowIso, todayStr } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  const fee = await prisma.fee.findFirst({ where: { id: params.id, academy_id: a.user.academy_id } });
  if (!fee) return fail(404, "Fee not found");
  const amount = Number(b.amount) || 0;
  await prisma.payment.create({ data: {
    academy_id: a.user.academy_id, fee_id: fee.id, student_id: fee.student_id, amount,
    method: b.method || "cash", paid_date: b.paid_date || todayStr(), note: b.note || "", recorded_by: a.user.id, created_at: nowIso(),
  } });
  const paid_amount = fee.paid_amount + amount;
  const status = paid_amount >= fee.amount ? "paid" : "pending";
  await prisma.fee.update({ where: { id: fee.id }, data: { paid_amount, status } });
  await audit(a.user, "fee.pay", "fee", fee.id, { amount, method: b.method });
  return json(await prisma.fee.findUnique({ where: { id: fee.id }, include: { payments: true } }));
}
