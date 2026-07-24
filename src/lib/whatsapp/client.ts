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

// Meta's message alone doesn't always say WHICH field is wrong ("Unsupported get
// request" is the same text whether the Phone Number ID is a typo or belongs to
// another app), so keep the numeric code/subcode with it — that pair is what an admin
// can look up, and what tells apart a 24-hour test token from a revoked one.
function metaError(data: any, status: number): string {
  const e = data?.error;
  const msg = e?.message || `Request failed (${status})`;
  const codes = [e?.code && `code ${e.code}`, e?.error_subcode && `subcode ${e.error_subcode}`]
    .filter(Boolean).join(", ");
  return codes ? `${msg} (${codes})` : msg;
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
      error: metaError(data, res.status),
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
        error: metaError(data, res.status),
        authError: isAuthError(res.status, data?.error?.code),
      };
    }
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Request failed" };
  }
}
