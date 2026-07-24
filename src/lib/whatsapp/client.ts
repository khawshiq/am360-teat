// Meta WhatsApp Business Cloud API via REST (no SDK dependency). Pure functions —
// phoneNumberId/accessToken are always passed in by the caller, never read from env.
// Multi-tenant by construction: there is no such thing as "the" WhatsApp credentials
// here, only "this academy's".
const GRAPH_VERSION = "v23.0";

export type WhatsAppSendResult =
  // `wamid` is Meta's message id and the ONLY handle by which a later delivery receipt
  // identifies this message — drop it and the webhook has nothing to match on.
  // `messageStatus` is Meta's own word for what it did: normally "accepted", but
  // "held_for_quality_assessment" means the message is parked and may never be sent.
  | { ok: true; wamid?: string; messageStatus?: string }
  | { ok: false; error: string; authError?: boolean };

function isAuthError(status: number, code: unknown) {
  // Meta's OAuthException for an invalid/expired token is error.code 190.
  return status === 401 || code === 190;
}

// Meta quotes the offending credential back inside its own error text — "Malformed
// access token EAAZAWnx…" — so relaying its message unedited would print a live token
// into the admin's browser, the red error box, the 400 response body, and anything
// downstream that captures either. Strip token-shaped runs before the message escapes
// this module. Nothing that reaches a caller is allowed to carry the secret.
function redactSecrets(msg: string, accessToken?: string): string {
  const out = accessToken && accessToken.length >= 8 ? msg.split(accessToken).join("<token>") : msg;
  // Also catch a token Meta returned in a form we can't string-match (truncated, or a
  // second copy from a double-paste): Meta tokens start EAA, and no legitimate word in
  // an error message is a 40+ character unbroken credential-shaped run.
  return out
    .replace(/\bEAA[A-Za-z0-9_-]{10,}/g, "<token>")
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, "<token>");
}

// Meta's message alone doesn't always say WHICH field is wrong ("Unsupported get
// request" is the same text whether the Phone Number ID is a typo or belongs to
// another app), so keep the numeric code/subcode with it — that pair is what an admin
// can look up, and what tells apart a 24-hour test token from a revoked one.
function metaError(data: any, status: number, accessToken?: string): string {
  const e = data?.error;
  const msg = redactSecrets(e?.message || `Request failed (${status})`, accessToken);
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
    const data = await res.json().catch(() => null);
    if (res.ok) {
      const m = data?.messages?.[0];
      return { ok: true, wamid: m?.id, messageStatus: m?.message_status };
    }
    return {
      ok: false,
      error: metaError(data, res.status, accessToken),
      authError: isAuthError(res.status, data?.error?.code),
    };
  } catch (e: any) {
    return { ok: false, error: redactSecrets(e?.message || "WhatsApp send failed", accessToken) };
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
        error: metaError(data, res.status, accessToken),
        authError: isAuthError(res.status, data?.error?.code),
      };
    }
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: redactSecrets(e?.message || "Request failed", accessToken) };
  }
}
