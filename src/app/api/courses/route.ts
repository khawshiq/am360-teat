export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, adminAuth, json, nowIso, planError } from "@/lib/api";
import { assertWithinPlan } from "@/lib/plan";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const includeInactive = new URL(req.url).searchParams.get("include_inactive") === "1";
  const where: any = { academy_id: a.user.academy_id };
  if (!includeInactive) where.status = "active";
  return json(await prisma.course.findMany({ where, orderBy: { name: "asc" } }));
}

export async function POST(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  try { await assertWithinPlan(a.user.academy_id, "courses"); } catch (e) { const r = planError(e); if (r) return r; throw e; }
  const b = await req.json();
  const course = await prisma.course.create({ data: {
    academy_id: a.user.academy_id, name: b.name, description: b.description || "",
    status: "active", created_at: nowIso(),
  } });
  await audit(a.user, "course.create", "course", course.id, { name: course.name });
  return json(course);
}
