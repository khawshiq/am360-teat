import { NextResponse } from "next/server";
import { getUser } from "./auth";
import { PlanLimitError, PlanFeatureError } from "./plan";

export const json = (data: any, status = 200) => NextResponse.json(data, { status });
export const fail = (status: number, detail: string) =>
  NextResponse.json({ detail }, { status });

// If `e` is a plan-limit breach, return a 402 the client turns into an upgrade
// popup; otherwise return null so the caller rethrows. Usage in a create route:
//   try { await assertWithinPlan(u.academy_id, "students"); }
//   catch (e) { const r = planError(e); if (r) return r; throw e; }
export function planError(e: any): NextResponse | null {
  if (e instanceof PlanLimitError)
    return NextResponse.json(
      { detail: e.message, code: "PLAN_LIMIT", resource: e.resource, limit: e.limit },
      { status: 402 },
    );
  // A missing feature is the same paywall as a breached cap, so it rides the same
  // 402 + code, and the same UpgradeModal. `feature` (not `resource`) tells the popup
  // to say "not included in your plan" rather than "capped at N".
  if (e instanceof PlanFeatureError)
    return NextResponse.json(
      { detail: e.message, code: "PLAN_LIMIT", feature: e.feature },
      { status: 402 },
    );
  return null;
}

export const nowIso = () => new Date().toISOString();
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const uuid = () => crypto.randomUUID();

export function trainerBranchIds(user: any): string[] {
  if (user.branch_ids?.length) return user.branch_ids;
  return user.branch_id ? [user.branch_id] : [];
}

export async function auth(req: Request) {
  const user = await getUser(req);
  if (!user) return { error: fail(401, "Unauthorized") };
  return { user };
}
export async function adminAuth(req: Request) {
  const user = await getUser(req);
  if (!user) return { error: fail(401, "Unauthorized") };
  if (!["owner", "admin"].includes(user.role))
    return { error: fail(403, "Admin privileges required") };
  return { user };
}
