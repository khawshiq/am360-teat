export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { json, nowIso } from "@/lib/api";
import { superAuth } from "@/lib/superauth";
import { PLAN_DEFAULTS } from "@/lib/plan";

// Ensure the Free/Premium rows exist (idempotent), seeded from PLAN_DEFAULTS.
async function ensureSeeded() {
  for (const code of Object.keys(PLAN_DEFAULTS)) {
    const d = PLAN_DEFAULTS[code];
    const exists = await prisma.plan.findUnique({ where: { code } });
    if (!exists) {
      await prisma.plan.create({ data: {
        code: d.code, name: d.name,
        max_branches: d.max_branches, max_students: d.max_students,
        max_trainers: d.max_trainers, max_courses: d.max_courses,
        features: d.features as any,
        price_monthly: code === "premium" ? 999 : 0,
        price_yearly: code === "premium" ? 9999 : 0,
        created_at: nowIso(),
      } });
    }
  }
}

export async function GET(req: Request) {
  const a = await superAuth(req); if (a.error) return a.error;
  await ensureSeeded();
  return json(await prisma.plan.findMany({ orderBy: { price_monthly: "asc" } }));
}
