export const runtime = "nodejs";
import { json, fail } from "@/lib/api";
import { getPlanForAcademy } from "@/lib/plan";
import { audit } from "@/lib/audit";
import { resolveTenantOrSuperActor } from "@/lib/tenantOrSuperAuth";
import { whatsappIntegrationService } from "@/lib/whatsapp/service";
import { connectSchema } from "@/lib/whatsapp/validation";

// Same handler for "Connect" and "Update Credentials" — both are just an upsert.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));

  const r = await resolveTenantOrSuperActor(req, typeof b.academyId === "string" ? b.academyId : undefined);
  if (r.error) return r.error;
  const { academy_id, actor } = r;

  const plan = await getPlanForAcademy(academy_id);
  if (!plan.features?.messaging)
    return json({ detail: "This feature is available only in the Pro or Enterprise plan.", code: "PLAN_LIMIT", feature: "messaging" }, 402);

  const parsed = connectSchema.safeParse(b);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || "Invalid input");

  const integration = await whatsappIntegrationService.connect(academy_id, {
    business_account_id: parsed.data.businessAccountId,
    phone_number_id: parsed.data.phoneNumberId,
    access_token: parsed.data.accessToken,
    verify_token: parsed.data.verifyToken,
    webhook_secret: parsed.data.webhookSecret,
  });

  // Never log the token itself — only identifiers.
  await audit({ ...actor, academy_id }, "whatsapp_integration.connect", "whatsapp_integration", integration.id, {
    business_account_id: integration.business_account_id, phone_number_id: integration.phone_number_id,
  });

  return json({ connected: true, status: integration.status, phone_number_id: integration.phone_number_id });
}
