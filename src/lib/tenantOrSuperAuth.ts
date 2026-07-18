import { prisma } from "./prisma";
import { getUser } from "./auth";
import { getPlatformUser } from "./superauth";
import { fail } from "./api";

// Shared by every route that a tenant owner/admin AND a Super Admin may both call
// (WhatsApp settings, WhatsApp send/history). A tenant admin is scoped to their own
// academy_id from the JWT — academyIdInput is IGNORED for them, so a tenant caller can
// never point this at another academy no matter what the request body says. A Super
// Admin token carries no academy_id at all (it sits above every tenant), so it must name
// the target academy explicitly via academyIdInput. Mirrors how
// `PATCH /api/admin/academies/[id]` acts on a target academy.
export async function resolveTenantOrSuperActor(req: Request, academyIdInput?: string) {
  const tenantUser = await getUser(req);
  if (tenantUser) {
    if (!["owner", "admin"].includes(tenantUser.role)) return { error: fail(403, "Admin privileges required") };
    return { academy_id: tenantUser.academy_id as string, actor: tenantUser };
  }
  const platformUser = await getPlatformUser(req);
  if (platformUser) {
    const academyId = (academyIdInput || "").trim();
    if (!academyId) return { error: fail(400, "academyId is required for Super Admin") };
    const academy = await prisma.academy.findUnique({ where: { id: academyId } });
    if (!academy) return { error: fail(404, "Academy not found") };
    return { academy_id: academyId, actor: { id: platformUser.id, name: `${platformUser.name} (super admin)` } };
  }
  return { error: fail(401, "Unauthorized") };
}
