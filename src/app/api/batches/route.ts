export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, adminAuth, json, fail, nowIso, trainerBranchIds } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const sp = new URL(req.url).searchParams;
  const where: any = { academy_id: a.user.academy_id };
  if (sp.get("include_inactive") !== "1") where.status = "active";
  if (sp.get("branch_id")) where.branch_id = sp.get("branch_id");
  if (sp.get("course_id")) where.course_id = sp.get("course_id");
  if (a.user.role === "trainer") {
    const bids = trainerBranchIds(a.user);
    where.branch_id = bids.length ? { in: bids } : "__none__";
  }
  return json(await prisma.batch.findMany({ where, orderBy: { name: "asc" } }));
}

export async function POST(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  if (!(await prisma.branch.findFirst({ where: { id: b.branch_id, academy_id: a.user.academy_id } }))) return fail(400, "Invalid branch");
  const batch = await prisma.batch.create({ data: {
    academy_id: a.user.academy_id, branch_id: b.branch_id,
    course_id: b.course_id || null, trainer_id: b.trainer_id || null,
    name: b.name, start_time: b.start_time || "", end_time: b.end_time || "",
    status: "active", created_at: nowIso(),
  } });
  await audit(a.user, "batch.create", "batch", batch.id, { name: batch.name });
  return json(batch);
}
