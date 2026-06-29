export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, adminAuth, json, fail, nowIso, trainerBranchIds } from "@/lib/api";
import { trainerHasConflict } from "@/lib/conflict";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const sp = new URL(req.url).searchParams;
  const where: any = { academy_id: u.academy_id };
  if (u.role === "trainer") {
    where.OR = [{ trainer_id: u.id }, { branch_id: { in: trainerBranchIds(u) }, trainer_id: null }];
  } else {
    if (sp.get("branch_id")) where.branch_id = sp.get("branch_id");
    if (sp.get("trainer_id")) where.trainer_id = sp.get("trainer_id");
  }
  const items = await prisma.schedule.findMany({ where });
  items.sort((x: any, y: any) => (x.day_of_week - y.day_of_week) || x.start_time.localeCompare(y.start_time));
  return json(items);
}
export async function POST(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  if (!(await prisma.branch.findFirst({ where: { id: b.branch_id, academy_id: a.user.academy_id } }))) return fail(400, "Invalid branch");
  if (!(b.day_of_week >= 0 && b.day_of_week <= 6)) return fail(400, "day_of_week must be 0..6");
  if (b.trainer_id) {
    if (!(await prisma.user.findFirst({ where: { id: b.trainer_id, academy_id: a.user.academy_id, role: "trainer" } }))) return fail(400, "Invalid trainer");
    if (await trainerHasConflict(a.user.academy_id, b.trainer_id, b.day_of_week, b.start_time, b.end_time))
      return fail(409, "Trainer is already assigned during this time.");
  }
  const doc = await prisma.schedule.create({ data: {
    academy_id: a.user.academy_id, branch_id: b.branch_id, trainer_id: b.trainer_id || null, title: b.title,
    day_of_week: b.day_of_week, start_time: b.start_time, end_time: b.end_time, notes: b.notes || "", created_at: nowIso(),
  } });
  await audit(a.user, "schedule.create", "schedule", doc.id, { title: doc.title });
  return json(doc);
}
