export const runtime = "nodejs";
import { fail, json, configError } from "@/lib/api";
import { resolveTenantOrSuperActor } from "@/lib/tenantOrSuperAuth";
import { whatsappIntegrationService } from "@/lib/whatsapp/service";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const r = await resolveTenantOrSuperActor(req, typeof b.academyId === "string" ? b.academyId : undefined);
  if (r.error) return r.error;

  // testConnection() decrypts the stored token — same config faults as connect.
  let result;
  try {
    result = await whatsappIntegrationService.testConnection(r.academy_id);
  } catch (e) {
    const rr = configError(e);
    if (rr) return rr;
    throw e;
  }
  if (!result.ok) return fail(400, result.error);

  return json({
    connected: true,
    business_name: result.business_name,
    phone_number: result.display_phone_number,
    status: result.status,
  });
}
