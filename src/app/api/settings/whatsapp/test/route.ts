export const runtime = "nodejs";
import { fail, json } from "@/lib/api";
import { resolveTenantOrSuperActor } from "@/lib/tenantOrSuperAuth";
import { whatsappIntegrationService } from "@/lib/whatsapp/service";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const r = await resolveTenantOrSuperActor(req, typeof b.academyId === "string" ? b.academyId : undefined);
  if (r.error) return r.error;

  const result = await whatsappIntegrationService.testConnection(r.academy_id);
  if (!result.ok) return fail(400, result.error);

  return json({
    connected: true,
    business_name: result.business_name,
    phone_number: result.display_phone_number,
    status: result.status,
  });
}
