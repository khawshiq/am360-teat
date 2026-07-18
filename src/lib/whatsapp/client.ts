// Meta WhatsApp Business Cloud API via REST (no SDK dependency). Pure functions —
// phoneNumberId/accessToken are always passed in by the caller, never read from env.
// Multi-tenant by construction: there is no such thing as "the" WhatsApp credentials
// here, only "this academy's".
const GRAPH_VERSION = "v23.0";

export type WhatsAppSendResult =
  | { ok: true }
  | { ok: false; error: string; authError?: boolean };

function isAuthError(status: number, code: unknown) {
  // Meta's OAuthException for an invalid/expired token is error.code 190.
  return status === 401 || code === 190;
}

export async function sendWhatsAppMessage(phoneNumberId: string, accessToken: string, to: string, bodyText: string): Promise<WhatsAppSendResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: bodyText },
      }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => null);
    return {
      ok: false,
      error: data?.error?.message || `WhatsApp send failed (${res.status})`,
      authError: isAuthError(res.status, data?.error?.code),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "WhatsApp send failed" };
  }
}

export type PhoneNumberInfo = { verified_name?: string; display_phone_number?: string; quality_rating?: string; id: string };
export type PhoneNumberLookupResult =
  | { ok: true; data: PhoneNumberInfo }
  | { ok: false; error: string; authError?: boolean };

// Used by "Test Connection" — a cheap read that proves the token + phone number id
// are actually valid, and hands back the verified business name / display number.
export async function fetchPhoneNumberInfo(phoneNumberId: string, accessToken: string): Promise<PhoneNumberLookupResult> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error?.message || `Request failed (${res.status})`,
        authError: isAuthError(res.status, data?.error?.code),
      };
    }
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Request failed" };
  }
}
