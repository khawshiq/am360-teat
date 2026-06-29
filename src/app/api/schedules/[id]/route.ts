export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail } from "@/lib/api";
import { trainerHasConflict } from "@/lib/conflict";
import { audit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  const current = await prisma.schedule.findFirst({ where: { id: params.id, academy_id: a.user.academy_id } });
  if (!current) return fail(404, "Schedule not found");
  const trainer_id = b.trainer_id !== undefined ? b.trainer_id : current.trainer_id;
  const day = b.day_of_week ?? current.day_of_week;
  const start = b.start_time ?? current.start_time;
  const end = b.end_time ?? current.end_time;
  if (trainer_id && await trainerHasConflict(a.user.academy_id, trainer_id, day, start, end, params.id))
    return fail(409, "Trainer is already assigned during this time.");
  const data: any = {};
  for (const k of ["branch_id", "trainer_id", "title", "day_of_week", "start_time", "end_time", "notes"]) if (b[k] != null) data[k] = b[k];
  await prisma.schedule.updateMany({ where: { id: params.id, academy_id: a.user.academy_id }, data });
  await audit(a.user, "schedule.update", "schedule", params.id, data);
  return json(await prisma.schedule.findUnique({ where: { id: params.id } }));
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  await prisma.schedule.deleteMany({ where: { id: params.id, academy_id: a.user.academy_id } });
  await audit(a.user, "schedule.delete", "schedule", params.id);
  return json({ ok: true });
}
