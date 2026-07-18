export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { json, fail, nowIso } from "@/lib/api";
import { getPlanForAcademy } from "@/lib/plan";
import { audit } from "@/lib/audit";
import { whatsappConfigured } from "@/lib/whatsapp";
import {
  collectRecipients, sendBroadcast, resolveNotificationsActor,
  MAX_MESSAGE_LENGTH, RECIPIENT_TYPES, type RecipientType,
} from "@/lib/notifications";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));

  // Owner/admin (their own academy) or Super Admin (any academy, named in `academyId`).
  const r = await resolveNotificationsActor(req, typeof b.academyId === "string" ? b.academyId : undefined);
  if (r.error) return r.error;
  const { academy_id, actor } = r;

  // messaging is a boolean Plan.features flag (Pro+), checked against the TARGET
  // academy's plan even when a Super Admin is sending on its behalf.
  const plan = await getPlanForAcademy(academy_id);
  if (!plan.features?.messaging)
    return json({ detail: "Messaging feature is not available in your subscription.", code: "PLAN_LIMIT", feature: "messaging" }, 402);

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

  // Never trust branchId alone — it must belong to the target academy.
  const branch = await prisma.branch.findFirst({ where: { id: branchId, academy_id } });
  if (!branch) return fail(404, "Branch not found");

  const recipients = await collectRecipients(academy_id, branchId, recipientType as RecipientType);
  if (!recipients.length) return fail(400, "No valid WhatsApp recipients found.");

  const { successCount, failedCount, failedNumbers } = await sendBroadcast(recipients, message);
  const status = failedCount === 0 ? "completed" : successCount === 0 ? "failed" : "partial";

  const log = await prisma.notificationLog.create({ data: {
    academy_id,
    branch_id: branchId,
    recipient_type: recipientType,
    message,
    total_recipients: recipients.length,
    success_count: successCount,
    failed_count: failedCount,
    created_by: actor.name,
    created_at: nowIso(),
    status,
  } });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  // audit() reads actor.academy_id — set it here rather than threading it through the
  // shared helper, since a Super Admin actor otherwise carries none.
  await audit({ ...actor, academy_id }, "whatsapp.send", "notification_log", log.id, {
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
