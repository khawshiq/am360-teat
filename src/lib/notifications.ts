import { prisma } from "./prisma";
import { sendWhatsAppText } from "./whatsapp";
import { getUser } from "./auth";
import { getPlatformUser } from "./superauth";
import { fail } from "./api";

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

// Fires the batch with at most 5 requests in flight, retries a failed send once, and
// never lets one bad number stop the rest. Failed numbers are returned for the audit log
// and console.error'd individually so they show up in Vercel's function logs too.
export async function sendBroadcast(recipients: Recipient[], message: string) {
  let successCount = 0;
  let failedCount = 0;
  const failedNumbers: string[] = [];
  let next = 0;
  async function worker() {
    while (next < recipients.length) {
      const r = recipients[next++];
      let result = await sendWhatsAppText(r.phone, message);
      if (!result.ok) result = await sendWhatsAppText(r.phone, message);
      if (result.ok) successCount++;
      else {
        failedCount++;
        failedNumbers.push(r.phone);
        console.error(`[whatsapp] send failed to ${r.phone}: ${result.error}`);
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, recipients.length) }, worker);
  await Promise.all(workers);
  return { successCount, failedCount, failedNumbers };
}

// Both the academy owner/admin AND the platform Super Admin may send a broadcast. A
// tenant admin is scoped to their own academy_id from the JWT; the Super Admin token
// carries no academy_id at all (it sits above every tenant), so it must name the
// target academy explicitly via `academyIdInput`. Mirrors how
// `PATCH /api/admin/academies/[id]` acts on a target academy, and audits the same way:
// under that academy, with "(super admin)" appended to the actor name.
export async function resolveNotificationsActor(req: Request, academyIdInput?: string) {
  const tenantUser = await getUser(req);
  if (tenantUser) {
    if (!["owner", "admin"].includes(tenantUser.role)) return { error: fail(403, "Admin privileges required") };
    return { academy_id: tenantUser.academy_id as string, actor: tenantUser };
  }
  const platformUser = await getPlatformUser(req);
  if (platformUser) {
    const academyId = (academyIdInput || "").trim();
    if (!academyId) return { error: fail(400, "academyId is required for Super Admin") };
    const academy = await prisma.academy.findUnique({ where: { id: academyId } });
    if (!academy) return { error: fail(404, "Academy not found") };
    return { academy_id: academyId, actor: { id: platformUser.id, name: `${platformUser.name} (super admin)` } };
  }
  return { error: fail(401, "Unauthorized") };
}
