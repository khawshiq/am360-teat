import { prisma } from "./prisma";
import { sendWhatsAppMessage } from "./whatsapp/client";

export const MAX_MESSAGE_LENGTH = 1000;
export const RECIPIENT_TYPES = ["PARENTS", "STUDENTS", "BOTH"] as const;
export type RecipientType = (typeof RECIPIENT_TYPES)[number];

// Best-effort E.164 normalization. Every academy on this product is INR-billed, so a
// bare 10-digit mobile (or a 91-prefixed one without the +) is assumed Indian; anything
// else must already be a plausible E.164 number. Returns null rather than guessing wrong.
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;
  if (/^91[6-9]\d{9}$/.test(cleaned)) return `+${cleaned}`;
  if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`;
  return null;
}

export type Recipient = { student_id: string; name: string; phone: string };

// Scoped to one academy AND one branch — never a cross-branch or cross-academy read.
export async function collectRecipients(academy_id: string, branch_id: string, type: RecipientType): Promise<Recipient[]> {
  const students = await prisma.student.findMany({
    where: { academy_id, branch_id, status: "active" },
    select: { id: true, name: true, phone: true, emergency_contact: true },
  });
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const s of students) {
    const candidates: string[] = [];
    if (type === "STUDENTS" || type === "BOTH") candidates.push(s.phone);
    if (type === "PARENTS" || type === "BOTH") candidates.push(s.emergency_contact);
    for (const raw of candidates) {
      const phone = toE164(raw);
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      out.push({ student_id: s.id, name: s.name, phone });
    }
  }
  return out;
}

const CONCURRENCY = 5;

export type BroadcastCredentials = { phoneNumberId: string; accessToken: string };

// Fires the batch with at most 5 requests in flight, retries a failed send once, and
// never lets one bad number stop the rest. Failed numbers are returned for the audit log
// and console.error'd individually so they show up in Vercel's function logs too.
// `authError` comes back true if any send failed because the academy's own token was
// rejected by Meta — the caller marks the integration expired so the NEXT send fails
// fast with "reconnect" instead of quietly failing every recipient again.
export async function sendBroadcast(recipients: Recipient[], message: string, credentials: BroadcastCredentials) {
  let successCount = 0;
  let failedCount = 0;
  let authError = false;
  const failedNumbers: string[] = [];
  let next = 0;
  async function worker() {
    while (next < recipients.length) {
      const r = recipients[next++];
      let result = await sendWhatsAppMessage(credentials.phoneNumberId, credentials.accessToken, r.phone, message);
      if (!result.ok) result = await sendWhatsAppMessage(credentials.phoneNumberId, credentials.accessToken, r.phone, message);
      if (result.ok) successCount++;
      else {
        failedCount++;
        failedNumbers.push(r.phone);
        if (result.authError) authError = true;
        console.error(`[whatsapp] send failed to ${r.phone}: ${result.error}`);
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, recipients.length) }, worker);
  await Promise.all(workers);
  return { successCount, failedCount, failedNumbers, authError };
}
