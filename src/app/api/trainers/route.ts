export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail, nowIso, planError } from "@/lib/api";
import { assertWithinPlan } from "@/lib/plan";
import { hashPassword, stripPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const includeInactive = new URL(req.url).searchParams.get("include_inactive") === "1";
  const where: any = { academy_id: a.user.academy_id, role: "trainer" };
  if (!includeInactive) where.status = "active";
  const trainers = await prisma.user.findMany({ where });
  return json(trainers.map(stripPassword));
}
export async function POST(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  try { await assertWithinPlan(a.user.academy_id, "trainers"); } catch (e) { const r = planError(e); if (r) return r; throw e; }
  const b = await req.json();
  if (await prisma.user.findUnique({ where: { email: b.email } })) return fail(400, "Email already registered");
  const bids: string[] = [...(b.branch_ids || [])];
  if (b.branch_id && !bids.includes(b.branch_id)) bids.push(b.branch_id);
  if (!bids.length) return fail(400, "At least one branch must be assigned");
  const valid = await prisma.branch.count({ where: { academy_id: a.user.academy_id, id: { in: bids } } });
  if (valid !== bids.length) return fail(400, "One or more branches are invalid");
  const trainer = await prisma.user.create({ data: {
    academy_id: a.user.academy_id, name: b.name, email: b.email, username: b.username || null,
    password: hashPassword(b.password), role: "trainer", branch_ids: bids, branch_id: bids[0],
    phone: b.phone || "", address: b.address || "", photo_url: b.photo_url || null,
    joining_date: b.joining_date || null, status: "active", must_change_password: !!b.must_change_password, created_at: nowIso(),
  } });
  await audit(a.user, "trainer.create", "user", trainer.id, { name: trainer.name });
  return json(stripPassword(trainer));
}
