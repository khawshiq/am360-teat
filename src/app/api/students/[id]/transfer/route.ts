export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const { branch_id } = await req.json();
  if (!(await prisma.branch.findFirst({ where: { id: branch_id, academy_id: a.user.academy_id } }))) return fail(400, "Invalid branch");
  const res = await prisma.student.updateMany({ where: { id: params.id, academy_id: a.user.academy_id }, data: { branch_id } });
  if (res.count === 0) return fail(404, "Student not found");
  await audit(a.user, "student.transfer", "student", params.id, { branch_id });
  return json(await prisma.student.findUnique({ where: { id: params.id } }));
}
