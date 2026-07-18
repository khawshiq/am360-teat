import { nowIso } from "@/lib/api";
import { encrypt, decrypt } from "@/lib/crypto";
import { whatsappIntegrationRepository as repo } from "./repository";
import { sendWhatsAppMessage, fetchPhoneNumberInfo, type WhatsAppSendResult } from "./client";

export type ConnectInput = {
  business_account_id: string;
  phone_number_id: string;
  access_token: string;
  verify_token?: string;
  webhook_secret?: string;
};

const NOT_CONNECTED = "Please connect your WhatsApp Business account first.";
const EXPIRED = "Your WhatsApp connection has expired. Please reconnect.";
const INVALID = "Your WhatsApp connection is invalid. Please update your credentials.";

// The one place in the app that knows how to go from "an academy_id" to "a working
// set of WhatsApp credentials". Every route (settings AND notifications/send) goes
// through this — never Prisma or the Meta client directly for integration state.
export class WhatsAppIntegrationService {
  async getIntegration(academy_id: string) {
    return repo.findByAcademy(academy_id);
  }

  // Upsert: the same call both connects for the first time and updates credentials
  // later ("Connect" and "Update Credentials" in the UI are the same operation).
  async connect(academy_id: string, input: ConnectInput) {
    const now = nowIso();
    const access_token = encrypt(input.access_token);
    return repo.upsert(
      academy_id,
      {
        business_account_id: input.business_account_id,
        phone_number_id: input.phone_number_id,
        access_token,
        verify_token: input.verify_token || "",
        webhook_secret: input.webhook_secret || "",
        status: "connected",
        connected_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        business_account_id: input.business_account_id,
        phone_number_id: input.phone_number_id,
        access_token,
        verify_token: input.verify_token || "",
        webhook_secret: input.webhook_secret || "",
        status: "connected",
        connected_at: now,
        updated_at: now,
      },
    );
  }

  async disconnect(academy_id: string) {
    return repo.deactivate(academy_id);
  }

  decryptToken(integration: { access_token: string }): string {
    return decrypt(integration.access_token);
  }

  // DB-only check — no Meta API call. Used before every send so a dead connection
  // fails fast with the right message instead of burning through a whole broadcast.
  async validateConnection(academy_id: string) {
    const integration = await repo.findByAcademy(academy_id);
    if (!integration || integration.status === "disconnected")
      return { ok: false as const, error: NOT_CONNECTED };
    if (integration.status === "expired")
      return { ok: false as const, error: EXPIRED };
    if (integration.status === "invalid")
      return { ok: false as const, error: INVALID };
    return { ok: true as const, integration };
  }

  // Decrypted, ready-to-use credentials for a batch send — decrypts once, not once
  // per recipient.
  async getCredentials(academy_id: string) {
    const check = await this.validateConnection(academy_id);
    if (!check.ok) return { ok: false as const, error: check.error };
    return {
      ok: true as const,
      phoneNumberId: check.integration.phone_number_id,
      accessToken: this.decryptToken(check.integration),
    };
  }

  // "Test Connection" — actually calls Meta, updates last_validated_at / business
  // details on success, flips status to expired/invalid on failure so the next send
  // attempt fails fast without round-tripping to Meta again.
  async testConnection(academy_id: string) {
    const integration = await repo.findByAcademy(academy_id);
    if (!integration) return { ok: false as const, error: NOT_CONNECTED };
    const token = this.decryptToken(integration);
    const result = await fetchPhoneNumberInfo(integration.phone_number_id, token);
    const now = nowIso();
    if (!result.ok) {
      await repo.updateStatus(academy_id, { status: result.authError ? "expired" : "invalid", updated_at: now });
      return { ok: false as const, error: result.authError ? EXPIRED : result.error };
    }
    await repo.updateStatus(academy_id, {
      status: "connected",
      business_name: result.data.verified_name || integration.business_name,
      display_phone_number: result.data.display_phone_number || integration.display_phone_number,
      last_validated_at: now,
      updated_at: now,
    });
    return {
      ok: true as const,
      business_name: result.data.verified_name || integration.business_name,
      display_phone_number: result.data.display_phone_number || integration.display_phone_number,
      status: "connected",
    };
  }

  async markExpired(academy_id: string) {
    await repo.updateStatus(academy_id, { status: "expired", updated_at: nowIso() });
  }

  // Single-message convenience wrapper (the broadcast path in src/lib/notifications.ts
  // fetches credentials once via getCredentials() and calls sendWhatsAppMessage
  // directly, to avoid a DB round-trip per recipient).
  async sendMessage(academy_id: string, to: string, bodyText: string): Promise<WhatsAppSendResult | { ok: false; error: string }> {
    const creds = await this.getCredentials(academy_id);
    if (!creds.ok) return { ok: false, error: creds.error };
    const result = await sendWhatsAppMessage(creds.phoneNumberId, creds.accessToken, to, bodyText);
    if (!result.ok && result.authError) await this.markExpired(academy_id);
    return result;
  }
}

export const whatsappIntegrationService = new WhatsAppIntegrationService();
