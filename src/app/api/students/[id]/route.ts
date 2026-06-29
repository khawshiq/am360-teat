export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, adminAuth, json, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

const EDITABLE = ["name","parent_name","phone","alt_mobile","email","address","dob","gender","admission_date","batch","course","photo_url","emergency_contact","medical_notes","monthly_fee","notes","status"];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const b = await req.json();
  const where: any = { id: params.id, academy_id: u.academy_id };
  if (u.role === "trainer") where.branch_id = u.branch_id;
  const data: any = {};
  for (const k of EDITABLE) if (b[k] != null) data[k] = b[k];
  const res = await prisma.student.updateMany({ where, data });
  if (res.count === 0) return fail(404, "Student not found");
  await audit(u, "student.update", "student", params.id, data);
  return json(await prisma.student.findUnique({ where: { id: params.id } }));
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  await prisma.student.deleteMany({ where: { id: params.id, academy_id: a.user.academy_id } });
  await audit(a.user, "student.delete", "student", params.id);
  return json({ ok: true });
}
