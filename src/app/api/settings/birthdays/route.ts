export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail, nowIso, todayStr } from "@/lib/api";
import { getPlanForAcademy } from "@/lib/plan";
import { audit } from "@/lib/audit";
import { RECIPIENT_TYPES, type RecipientType } from "@/lib/notifications";
import {
  getBirthdaySettings, birthdaysOn, DEFAULT_BIRTHDAY_MESSAGE, MAX_BIRTHDAY_MESSAGE,
} from "@/lib/birthdays";

// Per-academy settings for automatic birthday wishes, plus today's birthday list so the
// settings screen can show who would actually be messaged.

export async function GET(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const aid = a.user.academy_id;
  const today = todayStr();
  const [settings, plan, students] = await Promise.all([
    getBirthdaySettings(aid),
    getPlanForAcademy(aid),
    birthdaysOn(aid, today),
  ]);
  const [sentToday, integration, activeStudents, withDob] = await Promise.all([
    prisma.birthdayWish.count({ where: { academy_id: aid, date: today, status: "sent" } }),
    prisma.whatsAppIntegration.findUnique({ where: { academy_id: aid }, select: { status: true } }),
    prisma.student.count({ where: { academy_id: aid, status: "active" } }),
    // A birthday feature over students with no date of birth is a silent no-op forever.
    // Counting them is the difference between "nothing today" and "nothing, ever".
    prisma.student.count({ where: { academy_id: aid, status: "active", NOT: { dob: null } } }),
  ]);
  return json({
    ...settings,
    default_message: DEFAULT_BIRTHDAY_MESSAGE,
    max_length: MAX_BIRTHDAY_MESSAGE,
    // What the screen needs to explain *why* nothing would send, rather than just
    // failing silently on the day: the plan flag and the WhatsApp connection.
    messaging_allowed: !!plan.features?.messaging,
    whatsapp_status: integration?.status || "disconnected",
    today: today,
    today_count: students.length,
    today_students: students.map(s => ({ id: s.id, name: s.name, dob: s.dob })),
    sent_today: sentToday,
    active_students: activeStudents,
    students_with_dob: withDob,
  });
}

export async function PUT(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const aid = a.user.academy_id;
  const b = await req.json().catch(() => ({}));
  const current = await getBirthdaySettings(aid);

  const enabled = typeof b.enabled === "boolean" ? b.enabled : current.enabled;
  const recipient_type = typeof b.recipient_type === "string" ? b.recipient_type.toUpperCase() : current.recipient_type;
  const message = typeof b.message === "string" ? b.message.trim() : current.message;

  if (!(RECIPIENT_TYPES as readonly string[]).includes(recipient_type))
    return fail(400, "recipient_type must be one of PARENTS, STUDENTS, BOTH");
  if (!message) return fail(400, "Message cannot be empty");
  if (message.length > MAX_BIRTHDAY_MESSAGE) return fail(400, `Message must be ${MAX_BIRTHDAY_MESSAGE} characters or fewer`);
  if (/<[a-z][\s\S]*>/i.test(message)) return fail(400, "Message cannot contain HTML markup");

  // Gated on TURNING IT ON only. Switching a feature off must always work, even off-plan —
  // same rule as WhatsApp disconnect. A 402 here drives the upgrade popup.
  if (enabled && !current.enabled) {
    const plan = await getPlanForAcademy(aid);
    if (!plan.features?.messaging)
      return json({ detail: "This feature is available only in the Pro or Enterprise plan.", code: "PLAN_LIMIT", feature: "messaging" }, 402);
  }

  const now = nowIso();
  await prisma.birthdayGreeting.upsert({
    where: { academy_id: aid },
    create: { academy_id: aid, enabled, recipient_type, message, created_at: now, updated_at: now },
    update: { enabled, recipient_type, message, updated_at: now },
  });
  await audit(a.user, "birthday_greeting.update", "birthday_greeting", aid, { enabled, recipient_type });
  return json(await getBirthdaySettings(aid));
}
