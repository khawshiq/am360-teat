export const runtime = "nodejs";
import { json } from "@/lib/api";
import { resolveTenantOrSuperActor } from "@/lib/tenantOrSuperAuth";
import { whatsappIntegrationService } from "@/lib/whatsapp/service";

// Status view for the settings page. Never returns access_token / verify_token /
// webhook_secret — those never leave the server once saved.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const r = await resolveTenantOrSuperActor(req, sp.get("academyId") || undefined);
  if (r.error) return r.error;

  const integration = await whatsappIntegrationService.getIntegration(r.academy_id);
  if (!integration) return json({ connected: false, status: "disconnected" });

  return json({
    connected: integration.status === "connected",
    status: integration.status,
    business_name: integration.business_name,
    display_phone_number: integration.display_phone_number,
    connected_at: integration.connected_at,
    last_validated_at: integration.last_validated_at,
  });
}
