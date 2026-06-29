import { prisma } from "./prisma";
import { nowIso } from "./api";

export async function audit(actor: any, action: string, entity: string, entity_id: string, meta?: any) {
  try {
    await prisma.auditLog.create({ data: {
      academy_id: actor.academy_id, actor_id: actor.id, actor_name: actor.name,
      action, entity, entity_id, meta: meta ?? undefined, created_at: nowIso(),
    } });
  } catch (e) { /* never block the main action on an audit failure */ }
}
