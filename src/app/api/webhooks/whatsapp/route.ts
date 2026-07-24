export const runtime = "nodejs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { nowIso } from "@/lib/api";

// Meta's callback into AM360 — the ONLY place a message's real outcome ever arrives.
// A 200 from the send API means "accepted"; whether it reached a phone is reported here,
// minutes later, and nowhere else. Until this route existed, an undelivered message was
// indistinguishable from a delivered one.
//
// SESSION-LESS BY NECESSITY. Meta holds no AM360 token and knows nothing of our academy
// ids, so this route cannot use adminAuth/superAuth. It is multi-tenant on ONE public URL,
// and resolves the tenant the only way the payload allows:
//   - GET  (subscription handshake) → match `hub.verify_token` against a stored verify_token
//   - POST (events)                 → look the integration up by `phone_number_id`
// Note the inversion of invariant #1: the academy_id comes from the payload because there
// is no JWT to take it from. Everything written is then scoped to the academy that owns
// that phone number, so a payload can only ever touch its own tenant's rows.

const STATUS_RANK: Record<string, number> = { accepted: 0, held: 0, sent: 1, delivered: 2, read: 3 };

// Meta re-sends events, and its retries are not ordered — a late "sent" must never
// overwrite an already-recorded "delivered". `failed` is terminal and always wins.
function shouldAdvance(current: string, incoming: string): boolean {
  if (incoming === "failed") return current !== "failed";
  if (current === "failed") return false;
  return (STATUS_RANK[incoming] ?? -1) > (STATUS_RANK[current] ?? -1);
}

// Meta's subscription handshake: echo hub.challenge back as plain text, but only if the
// verify token matches one an academy actually configured. An empty stored token must
// never match an empty query value — that would make the handshake succeed for anyone.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token") || "";
  const challenge = sp.get("hub.challenge") || "";
  if (mode !== "subscribe" || !token) return new Response("Forbidden", { status: 403 });

  const match = await prisma.whatsAppIntegration.findFirst({ where: { verify_token: token } });
  if (!match) return new Response("Forbidden", { status: 403 });

  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
}

export async function POST(req: Request) {
  // Read the RAW body — the signature is computed over the exact bytes Meta sent, so
  // re-serializing a parsed object would invalidate it.
  const raw = await req.text();
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response("ok", { status: 200 }); }

  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      const phone_number_id = value?.metadata?.phone_number_id;
      if (!phone_number_id) continue;

      // The tenant is whoever owns this WhatsApp number. Meta's callback carries no
      // academy id, which is exactly why the lookup is by phone_number_id.
      const integration = await prisma.whatsAppIntegration.findFirst({ where: { phone_number_id } });
      if (!integration) continue;

      if (!verifySignature(req, raw, integration.webhook_secret)) {
        console.warn(`[whatsapp-webhook] bad signature for phone_number_id ${phone_number_id}`);
        continue;
      }

      await applyStatuses(integration.academy_id, value?.statuses || []);
    }
  }

  // Always 200. A non-2xx makes Meta retry the whole batch and, after enough failures,
  // disable the subscription — losing delivery reporting for every academy at once.
  return new Response("ok", { status: 200 });
}

// X-Hub-Signature-256 = HMAC-SHA256 of the raw body, keyed by the app secret the academy
// stored as `webhook_secret`. When no secret is configured we cannot verify, and we accept:
// these events only ever move a status forward on a row we already created from our own
// send, so the worst a forged call can do is mislabel a message we sent. Configuring the
// secret closes that off, and the settings page should be used to set one.
function verifySignature(req: Request, raw: string, secret: string): boolean {
  if (!secret) return true;
  const header = req.headers.get("x-hub-signature-256") || "";
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on a length mismatch.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function applyStatuses(academy_id: string, statuses: any[]) {
  const touchedNotifications = new Set<string>();

  for (const s of statuses) {
    const wamid = s?.id;
    const incoming = String(s?.status || "").toLowerCase();
    if (!wamid || !incoming) continue;

    // Scoped by academy_id as well as wamid: the id came from an unauthenticated request,
    // so it is never trusted to select a row on its own.
    const row = await prisma.whatsAppMessage.findFirst({ where: { wamid, academy_id } });
    if (!row || !shouldAdvance(row.status, incoming)) continue;

    const err = s?.errors?.[0];
    await prisma.whatsAppMessage.update({
      where: { id: row.id },
      data: {
        status: incoming,
        error_code: err?.code ? String(err.code) : row.error_code,
        // `error_data.details` is the sentence that actually explains a failure; `title`
        // alone is often just "Message Undeliverable".
        error_detail: (err?.error_data?.details || err?.title || err?.message || row.error_detail || "").slice(0, 300),
        updated_at: nowIso(),
      },
    });
    if (row.notification_id) touchedNotifications.add(row.notification_id);
  }

  // Roll the per-message truth up onto the broadcast the history page reads.
  for (const notification_id of touchedNotifications) {
    const [delivered, undelivered] = await Promise.all([
      prisma.whatsAppMessage.count({ where: { academy_id, notification_id, status: { in: ["delivered", "read"] } } }),
      prisma.whatsAppMessage.count({ where: { academy_id, notification_id, status: "failed" } }),
    ]);
    await prisma.notificationLog.updateMany({
      where: { id: notification_id, academy_id },
      data: { delivered_count: delivered, undelivered_count: undelivered },
    });
  }
}
