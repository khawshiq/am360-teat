export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  const data: any = {};
  for (const k of ["name", "description", "status"]) if (b[k] != null) data[k] = b[k];
  const res = await prisma.course.updateMany({ where: { id: params.id, academy_id: a.user.academy_id }, data });
  if (res.count === 0) return fail(404, "Course not found");
  await audit(a.user, "course.update", "course", params.id, data);
  return json(await prisma.course.findUnique({ where: { id: params.id } }));
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  await prisma.course.deleteMany({ where: { id: params.id, academy_id: a.user.academy_id } });
  await audit(a.user, "course.delete", "course", params.id);
  return json({ ok: true });
}
