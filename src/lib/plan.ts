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
// (Phase 2) can create/edit Plan rows to override these at runtime.
export const PLAN_DEFAULTS: Record<string, PlanLimits> = {
  free: {
    code: "free", name: "Free",
    max_branches: 1, max_students: 5, max_trainers: 2, max_courses: 2,
    features: { reports: false, export: false, messaging: false, backup: false },
  },
  premium: {
    code: "premium", name: "Premium",
    max_branches: -1, max_students: -1, max_trainers: -1, max_courses: -1,
    features: { reports: true, export: true, messaging: true, backup: true },
  },
};

// Academy.subscription_plan historically used "free"/"pro"; normalize to our codes.
function normalizeCode(code: string | null | undefined): string {
  const c = (code || "free").toLowerCase();
  if (c === "pro" || c === "premium") return "premium";
  return "free";
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

export async function getPlanForAcademy(academy_id: string): Promise<PlanLimits> {
  const academy = await prisma.academy.findUnique({ where: { id: academy_id } });
  const code = normalizeCode(academy?.subscription_plan);
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
