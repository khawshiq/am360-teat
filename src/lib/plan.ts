import { prisma } from "./prisma";

export type PlanLimits = {
  code: string;
  name: string;
  max_branches: number; // -1 = unlimited
  max_students: number;
  max_trainers: number;
  max_courses: number;
  features: Record<string, boolean>;
};

// Built-in defaults. Used when no matching Plan row exists in the DB, so plan
// limits work immediately after `prisma db push` with zero seeding. Super Admin
// can create/edit Plan rows (incl. pricing) to override these at runtime.
export const PLAN_DEFAULTS: Record<string, PlanLimits> = {
  free: {
    code: "free", name: "Free",
    max_branches: 1, max_students: 5, max_trainers: 2, max_courses: 2,
    features: { reports: false, export: false, messaging: false, backup: false },
  },
  basic: {
    code: "basic", name: "Basic",
    max_branches: 3, max_students: 75, max_trainers: 8, max_courses: 15,
    features: { reports: true, export: true, messaging: false, backup: false },
  },
  pro: {
    code: "pro", name: "Pro",
    max_branches: 10, max_students: 400, max_trainers: 30, max_courses: 60,
    features: { reports: true, export: true, messaging: true, backup: false },
  },
  enterprise: {
    code: "enterprise", name: "Enterprise",
    max_branches: -1, max_students: -1, max_trainers: -1, max_courses: -1,
    features: { reports: true, export: true, messaging: true, backup: true },
  },
};

// Default monthly / yearly pricing (₹) used when seeding Plan rows.
export const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  basic: { monthly: 499, yearly: 4990 },
  pro: { monthly: 999, yearly: 9990 },
  enterprise: { monthly: 2999, yearly: 29990 },
};

export const PAID_PLANS = ["basic", "pro", "enterprise"];
export const isPaidPlan = (code: string | null | undefined) =>
  PAID_PLANS.includes(String(code || "").toLowerCase());

// Normalize a stored plan code to one of our known codes. "premium" is a legacy
// alias for "pro"; anything unknown falls back to "free".
export function normalizeCode(code: string | null | undefined): string {
  const c = (code || "free").toLowerCase();
  if (c === "premium") return "pro";
  return PLAN_DEFAULTS[c] ? c : "free";
}

// Thrown by assertWithinPlan when a create would exceed the plan cap. Routes turn
// this into HTTP 402 with { code: "PLAN_LIMIT", ... } so the UI can show the upgrade popup.
export class PlanLimitError extends Error {
  resource: string;
  limit: number;
  constructor(resource: string, limit: number) {
    super(`Your plan allows a maximum of ${limit} ${resource}. Upgrade to add more.`);
    this.resource = resource;
    this.limit = limit;
  }
}

// Thrown when the academy's plan does not include a boolean feature (as opposed to
// being at a numeric cap). Routes turn it into the same 402 as PlanLimitError, so it
// drives the same upgrade popup — one paywall pipeline, not two.
export class PlanFeatureError extends Error {
  feature: string;
  constructor(feature: string, label: string) {
    super(`${label} is not included in your plan. Upgrade to unlock it.`);
    this.feature = feature;
  }
}

// Gate on one of Plan.features (reports | export | messaging | backup). These flags
// have existed since the plan ladder was written and, until exports, nothing read them.
export async function assertFeature(academy_id: string, feature: string, label: string) {
  const plan = await getPlanForAcademy(academy_id);
  if (!plan.features?.[feature]) throw new PlanFeatureError(feature, label);
}

// Ensure a Plan row exists for every known tier (idempotent). Safe to call from
// any authenticated request; used to bootstrap pricing with zero manual seeding.
export async function ensurePlansSeeded() {
  for (const code of Object.keys(PLAN_DEFAULTS)) {
    const exists = await prisma.plan.findUnique({ where: { code } }).catch(() => null);
    if (exists) continue;
    const d = PLAN_DEFAULTS[code];
    const price = PLAN_PRICES[code] || { monthly: 0, yearly: 0 };
    await prisma.plan.create({ data: {
      code: d.code, name: d.name,
      max_branches: d.max_branches, max_students: d.max_students,
      max_trainers: d.max_trainers, max_courses: d.max_courses,
      features: d.features as any,
      price_monthly: price.monthly, price_yearly: price.yearly,
      created_at: new Date().toISOString(),
    } }).catch(() => {});
  }
}

// A paid period has lapsed once today is past its end date (YYYY-MM-DD strings
// sort lexicographically, so a string compare is correct).
export function isSubscriptionExpired(expires: string | null | undefined): boolean {
  if (!expires) return false;
  return expires < new Date().toISOString().slice(0, 10);
}

export async function getPlanForAcademy(academy_id: string): Promise<PlanLimits> {
  const academy = await prisma.academy.findUnique({ where: { id: academy_id } });
  let code = normalizeCode(academy?.subscription_plan);
  // A lapsed paid plan reverts to Free limits until renewed.
  if (code !== "free" && isSubscriptionExpired(academy?.subscription_expires)) code = "free";
  const row = await prisma.plan.findUnique({ where: { code } }).catch(() => null);
  if (row) {
    return {
      code: row.code, name: row.name,
      max_branches: row.max_branches, max_students: row.max_students,
      max_trainers: row.max_trainers, max_courses: row.max_courses,
      features: (row.features as any) || PLAN_DEFAULTS[code].features,
    };
  }
  return PLAN_DEFAULTS[code];
}

type Resource = "branches" | "students" | "trainers" | "courses";

const RESOURCE_MAP: Record<Resource, { field: keyof PlanLimits; count: (academy_id: string) => Promise<number> }> = {
  branches: { field: "max_branches", count: (id) => prisma.branch.count({ where: { academy_id: id, status: "active" } }) },
  students: { field: "max_students", count: (id) => prisma.student.count({ where: { academy_id: id, status: "active" } }) },
  trainers: { field: "max_trainers", count: (id) => prisma.user.count({ where: { academy_id: id, role: "trainer", status: "active" } }) },
  courses:  { field: "max_courses",  count: (id) => prisma.course.count({ where: { academy_id: id, status: "active" } }) },
};

// Throws PlanLimitError if the academy is already at its cap for `resource`.
export async function assertWithinPlan(academy_id: string, resource: Resource) {
  const plan = await getPlanForAcademy(academy_id);
  const spec = RESOURCE_MAP[resource];
  const limit = plan[spec.field] as number;
  if (limit === -1) return; // unlimited
  const current = await spec.count(academy_id);
  if (current >= limit) throw new PlanLimitError(resource, limit);
}
