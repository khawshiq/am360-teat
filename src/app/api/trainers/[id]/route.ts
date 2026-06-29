export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail } from "@/lib/api";
import { stripPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  const data: any = {};
  for (const k of ["name", "phone", "address", "photo_url", "joining_date", "status"]) if (b[k] != null) data[k] = b[k];
  if (b.branch_ids != null) {
    if (!b.branch_ids.length) return fail(400, "At least one branch must be assigned");
    const valid = await prisma.branch.count({ where: { academy_id: a.user.academy_id, id: { in: b.branch_ids } } });
    if (valid !== b.branch_ids.length) return fail(400, "One or more branches are invalid");
    data.branch_ids = b.branch_ids; data.branch_id = b.branch_ids[0];
  }
  if (Object.keys(data).length) {
    const res = await prisma.user.updateMany({ where: { id: params.id, academy_id: a.user.academy_id, role: "trainer" }, data });
    if (res.count === 0) return fail(404, "Trainer not found");
    await audit(a.user, b.branch_ids ? "trainer.transfer" : "trainer.update", "user", params.id, data);
  }
  const t = await prisma.user.findFirst({ where: { id: params.id, academy_id: a.user.academy_id, role: "trainer" } });
  return json(t ? stripPassword(t) : null);
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  await prisma.user.deleteMany({ where: { id: params.id, academy_id: a.user.academy_id, role: "trainer" } });
  await audit(a.user, "trainer.delete", "user", params.id);
  return json({ ok: true });
}
