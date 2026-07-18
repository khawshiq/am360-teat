export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail, nowIso, planError } from "@/lib/api";
import { assertFeature } from "@/lib/plan";
import { audit } from "@/lib/audit";
import { whatsappConfigured } from "@/lib/whatsapp";
import { collectRecipients, sendBroadcast, MAX_MESSAGE_LENGTH, RECIPIENT_TYPES, type RecipientType } from "@/lib/notifications";

export async function POST(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;

  // Feature-gated, not just plan-limit-gated: messaging is a boolean feature (Pro+),
  // same 402 -> upgrade-popup pipeline as exports.
  try { await assertFeature(a.user.academy_id, "messaging", "WhatsApp messaging"); }
  catch (e) { const r = planError(e); if (r) return r; throw e; }

  const b = await req.json().catch(() => ({}));
  const branchId = typeof b.branchId === "string" ? b.branchId.trim() : "";
  const recipientType = typeof b.recipientType === "string" ? b.recipientType.toUpperCase() : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";

  if (!branchId) return fail(400, "branchId is required");
  if (!RECIPIENT_TYPES.includes(recipientType as RecipientType))
    return fail(400, "recipientType must be one of PARENTS, STUDENTS, BOTH");
  if (!message) return fail(400, "message is required");
  if (message.length > MAX_MESSAGE_LENGTH) return fail(400, `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
  if (/<[a-z][\s\S]*>/i.test(message)) return fail(400, "Message cannot contain HTML markup");

  if (!whatsappConfigured())
    return fail(503, "WhatsApp is not configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)");

  // Never trust branchId alone — it must belong to THIS academy.
  const branch = await prisma.branch.findFirst({ where: { id: branchId, academy_id: a.user.academy_id } });
  if (!branch) return fail(404, "Branch not found");

  const recipients = await collectRecipients(a.user.academy_id, branchId, recipientType as RecipientType);
  if (!recipients.length) return fail(400, "No valid WhatsApp recipients found.");

  const { successCount, failedCount, failedNumbers } = await sendBroadcast(recipients, message);
  const status = failedCount === 0 ? "completed" : successCount === 0 ? "failed" : "partial";

  const log = await prisma.notificationLog.create({ data: {
    academy_id: a.user.academy_id,
    branch_id: branchId,
    recipient_type: recipientType,
    message,
    total_recipients: recipients.length,
    success_count: successCount,
    failed_count: failedCount,
    created_by: a.user.name,
    created_at: nowIso(),
    status,
  } });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  await audit(a.user, "whatsapp.send", "notification_log", log.id, {
    branch_id: branchId, branch_name: branch.name, recipient_type: recipientType,
    recipient_count: recipients.length, success_count: successCount, failed_count: failedCount,
    message, ip, failed_numbers: failedNumbers,
  });

  return json({
    success: true,
    totalRecipients: recipients.length,
    successCount,
    failedCount,
    notificationId: log.id,
  });
}
