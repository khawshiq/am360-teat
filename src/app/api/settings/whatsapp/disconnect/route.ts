export const runtime = "nodejs";
import { fail, json } from "@/lib/api";
import { audit } from "@/lib/audit";
import { resolveTenantOrSuperActor } from "@/lib/tenantOrSuperAuth";
import { whatsappIntegrationService } from "@/lib/whatsapp/service";

export async function DELETE(req: Request) {
  const sp = new URL(req.url).searchParams;
  const r = await resolveTenantOrSuperActor(req, sp.get("academyId") || undefined);
  if (r.error) return r.error;
  const { academy_id, actor } = r;

  const integration = await whatsappIntegrationService.getIntegration(academy_id);
  if (!integration) return fail(400, "Please connect your WhatsApp Business account first.");

  await whatsappIntegrationService.disconnect(academy_id);
  await audit({ ...actor, academy_id }, "whatsapp_integration.disconnect", "whatsapp_integration", integration.id, {});

  return json({ disconnected: true });
}
