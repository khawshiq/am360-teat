// Meta WhatsApp Business Cloud API via REST (no SDK dependency), same pattern as
// razorpay.ts / email.ts. Configure in Vercel env:
//   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
const GRAPH_VERSION = "v23.0";

export const whatsappConfigured = () =>
  !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

export type WhatsAppResult = { ok: true } | { ok: false; error: string };

// Sends one text message. Never throws — a broadcast to hundreds of numbers must
// keep going past a single bad number, so failure is a return value, not an exception.
export async function sendWhatsAppText(to: string, bodyText: string): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, error: "WhatsApp is not configured" };
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: bodyText },
      }),
    });
    if (res.ok) return { ok: true };
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `WhatsApp send failed (${res.status}): ${detail}` };
  } catch (e: any) {
    return { ok: false, error: e?.message || "WhatsApp send failed" };
  }
}
