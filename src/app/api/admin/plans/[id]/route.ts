export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { json, fail } from "@/lib/api";
import { superAuth } from "@/lib/superauth";

// Edit a plan's limits / pricing / feature flags. Changes apply to every academy on that plan.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await superAuth(req); if (a.error) return a.error;
  const b = await req.json();
  const data: any = {};
  for (const k of ["name", "max_branches", "max_students", "max_trainers", "max_courses", "price_monthly", "price_yearly"]) {
    if (b[k] != null) data[k] = k.startsWith("max_") ? parseInt(b[k], 10) : (k.startsWith("price_") ? Number(b[k]) : b[k]);
  }
  if (b.features != null) data.features = b.features;
  const res = await prisma.plan.updateMany({ where: { id: params.id }, data });
  if (res.count === 0) return fail(404, "Plan not found");
  return json(await prisma.plan.findUnique({ where: { id: params.id } }));
}
