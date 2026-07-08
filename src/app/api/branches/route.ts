export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, adminAuth, json, nowIso, trainerBranchIds, planError } from "@/lib/api";
import { assertWithinPlan } from "@/lib/plan";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const includeInactive = new URL(req.url).searchParams.get("include_inactive") === "1";
  const where: any = { academy_id: a.user.academy_id };
  if (!includeInactive) where.status = "active";
  let branches = await prisma.branch.findMany({ where });
  if (a.user.role === "trainer") {
    const bids = new Set(trainerBranchIds(a.user));
    branches = branches.filter((b: any) => bids.has(b.id));
  }
  return json(branches);
}
export async function POST(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  try { await assertWithinPlan(a.user.academy_id, "branches"); } catch (e) { const r = planError(e); if (r) return r; throw e; }
  const b = await req.json();
  const branch = await prisma.branch.create({ data: {
    academy_id: a.user.academy_id, name: b.name, branch_code: b.branch_code || null,
    address: b.address || "", phone: b.phone || "", working_hours: b.working_hours || "", status: "active", created_at: nowIso(),
  } });
  await audit(a.user, "branch.create", "branch", branch.id, { name: branch.name });
  return json(branch);
}
