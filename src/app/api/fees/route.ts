export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, adminAuth, json, fail, nowIso, trainerBranchIds } from "@/lib/api";
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
  return json(await prisma.fee.findMany({ where, include: { payments: true } }));
}
export async function POST(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  if (!(await prisma.student.findFirst({ where: { id: b.student_id, academy_id: a.user.academy_id } }))) return fail(404, "Student not found");
  const fee = await prisma.fee.create({ data: {
    academy_id: a.user.academy_id, student_id: b.student_id, type: b.type || "monthly", amount: b.amount,
    paid_amount: 0, month: b.month, status: "pending", due_date: b.due_date || null, note: b.note || "", created_at: nowIso(),
  } });
  await audit(a.user, "fee.create", "fee", fee.id, { amount: fee.amount, type: fee.type });
  return json(fee);
}
