export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { json, fail, nowIso } from "@/lib/api";
import { superAuth } from "@/lib/superauth";

// Activate / suspend an academy and change its plan/subscription. Audited under the academy.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await superAuth(req); if (a.error) return a.error;
  const b = await req.json();
  const data: any = {};
  for (const k of ["status", "subscription_plan", "subscription_status"]) if (b[k] != null) data[k] = b[k];
  // Period fields are nullable and an explicit null/"" clears them. A paid plan with no
  // expiry never lapses (isSubscriptionExpired), which is how a permanent grant is stored.
  for (const k of ["subscription_started", "subscription_expires"]) if (k in b) data[k] = b[k] || null;
  const res = await prisma.academy.updateMany({ where: { id: params.id }, data });
  if (res.count === 0) return fail(404, "Academy not found");
  await prisma.auditLog.create({ data: {
    academy_id: params.id, actor_id: a.user.id, actor_name: `${a.user.name} (super admin)`,
    action: "academy.admin_update", entity: "academy", entity_id: params.id, meta: data, created_at: nowIso(),
  } }).catch(() => {});
  return json(await prisma.academy.findUnique({ where: { id: params.id } }));
}

// Hard-delete an academy and all its tenant data.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await superAuth(req); if (a.error) return a.error;
  const id = params.id;
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { academy_id: id } }),
    prisma.fee.deleteMany({ where: { academy_id: id } }),
    prisma.attendance.deleteMany({ where: { academy_id: id } }),
    prisma.classSession.deleteMany({ where: { academy_id: id } }),
    prisma.schedule.deleteMany({ where: { academy_id: id } }),
    prisma.batch.deleteMany({ where: { academy_id: id } }),
    prisma.course.deleteMany({ where: { academy_id: id } }),
    prisma.student.deleteMany({ where: { academy_id: id } }),
    prisma.branch.deleteMany({ where: { academy_id: id } }),
    prisma.user.deleteMany({ where: { academy_id: id } }),
    prisma.auditLog.deleteMany({ where: { academy_id: id } }),
    prisma.academy.deleteMany({ where: { id } }),
  ]);
  return json({ ok: true });
}
