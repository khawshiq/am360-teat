export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  const data: any = {};
  for (const k of ["name", "branch_id", "course_id", "trainer_id", "start_time", "end_time", "status"]) if (b[k] != null) data[k] = b[k];
  const res = await prisma.batch.updateMany({ where: { id: params.id, academy_id: a.user.academy_id }, data });
  if (res.count === 0) return fail(404, "Batch not found");
  await audit(a.user, "batch.update", "batch", params.id, data);
  return json(await prisma.batch.findUnique({ where: { id: params.id } }));
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  await prisma.batch.deleteMany({ where: { id: params.id, academy_id: a.user.academy_id } });
  await audit(a.user, "batch.delete", "batch", params.id);
  return json({ ok: true });
}
