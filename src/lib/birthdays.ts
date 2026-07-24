import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { nowIso } from "./api";
import { getPlanForAcademy } from "./plan";
import { toE164, RECIPIENT_TYPES, type RecipientType } from "./notifications";
import { sendWhatsAppMessage } from "./whatsapp/client";
import { whatsappIntegrationService } from "./whatsapp/service";

// Automatic birthday wishes over the academy's own WhatsApp Business number.
//
// Three things make this safe to run automatically, and none of them are optional:
//
// 1. **Opt-in.** `BirthdayGreeting.enabled` defaults to false. Nothing is ever sent for an
//    academy that has not deliberately turned this on. It messages real people with no
//    human in the loop — the default has to be "off".
// 2. **Send-once, guaranteed.** A `BirthdayWish` row is CLAIMED before the message goes
//    out, on a unique `(student, date, phone)` index. A retry, a second cron fire and a
//    dashboard load racing the cron all lose the race instead of wishing someone a happy
//    birthday four times. A send that then fails stays failed and is not retried: double
//    -messaging a customer is worse than missing one.
// 3. **Plan-gated.** Same `features.messaging` (Pro+) flag as the manual broadcast, so
//    this cannot become a back door into paid messaging.
//
// Two triggers, because there is no reliable scheduler here (see `runFor` callers):
// `POST /api/cron/birthdays` if the deployment has Vercel Cron configured, and a lazy
// call from the admin dashboard otherwise. Both are idempotent, so having both is free —
// whichever runs first that day does the work.

export const MAX_BIRTHDAY_MESSAGE = 600;

export const DEFAULT_BIRTHDAY_MESSAGE =
  "Happy birthday, {name}! 🎉 Wishing you a wonderful year ahead. — {academy}";

export type BirthdaySettings = {
  enabled: boolean;
  recipient_type: RecipientType;
  message: string;
  last_run_date: string | null;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const isDay = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d);

// Settings for an academy, with the defaults filled in when no row exists yet. Callers
// never have to null-check — an academy that never opened the settings page reads as
// "disabled, default template", which is exactly what it is.
export async function getBirthdaySettings(academy_id: string): Promise<BirthdaySettings> {
  const row = await prisma.birthdayGreeting.findUnique({ where: { academy_id } });
  return {
    enabled: row?.enabled ?? false,
    recipient_type: (RECIPIENT_TYPES as readonly string[]).includes(row?.recipient_type || "")
      ? (row!.recipient_type as RecipientType)
      : "BOTH",
    message: row?.message?.trim() || DEFAULT_BIRTHDAY_MESSAGE,
    last_run_date: row?.last_run_date ?? null,
  };
}

// `{name}` / `{academy}`, case-insensitive, and nothing else. Deliberately not a real
// template language: the output goes to WhatsApp under the academy's own business number,
// so an admin typing a stray brace must produce a slightly odd message, never an error
// and never someone else's data.
export function renderBirthdayMessage(template: string, vars: { name: string; academy: string }): string {
  return template
    .replace(/\{\s*name\s*\}/gi, vars.name)
    .replace(/\{\s*academy\s*\}/gi, vars.academy)
    .slice(0, MAX_BIRTHDAY_MESSAGE);
}

/**
 * Active students of an academy whose birthday falls on `day` (`YYYY-MM-DD`).
 *
 * Matched on month+day, ignoring the year — `dob` is a birth date, not an anniversary.
 * Done in JS rather than SQL because `dob` is a `String` column (every date here is), so
 * there is no date function to call on it; the row count per academy is small.
 *
 * 29 February folds onto 28 February in a non-leap year, so a leap-day student is wished
 * every year rather than once every four.
 */
export async function birthdaysOn(academy_id: string, day = todayStr(), branch_id?: string) {
  const students = await prisma.student.findMany({
    where: { academy_id, status: "active", ...(branch_id ? { branch_id } : {}) },
    select: { id: true, name: true, dob: true, phone: true, emergency_contact: true, branch_id: true, photo_url: true },
    orderBy: { name: "asc" },
  });
  const md = day.slice(5, 10);
  const isLeapDay = md === "02-28" && !isLeapYear(Number(day.slice(0, 4)));
  return students.filter(s => {
    if (!isDay(s.dob)) return false;
    const b = s.dob.slice(5, 10);
    return b === md || (isLeapDay && b === "02-29");
  });
}

const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// The next `days` days AFTER `from` (today excluded — that is the "birthdays today" list),
// each active student whose birthday falls in that window, tagged with how many days off it
// is and the calendar date it lands on. Matched on month+day so it wraps a month or year
// boundary for free: 30 Dec + 7 days reaches into January without any special-casing.
//
// A 29 Feb birthday shows on 28 Feb in a common year, matching how the wish itself folds —
// the person is greeted the same day they'd be messaged, not on a date that doesn't exist.
export async function upcomingBirthdays(academy_id: string, from = todayStr(), days = 7, branch_id?: string) {
  const students = await prisma.student.findMany({
    where: { academy_id, status: "active", ...(branch_id ? { branch_id } : {}) },
    select: { id: true, name: true, dob: true, branch_id: true, photo_url: true },
  });

  const base = new Date(`${from}T00:00:00Z`);
  // md -> { in_days, date } for each of the next `days` calendar days.
  const window = new Map<string, { in_days: number; date: string }>();
  for (let i = 1; i <= days; i++) {
    const d = new Date(base.getTime() + i * 864e5);
    const iso = d.toISOString().slice(0, 10);
    let md = iso.slice(5, 10);
    // A 29 Feb that isn't in this window's year shows on the 28th, same fold as the wish.
    if (md === "02-28" && !isLeapYear(d.getUTCFullYear()) && !window.has("02-29"))
      window.set("02-29", { in_days: i, date: iso });
    if (!window.has(md)) window.set(md, { in_days: i, date: iso });
  }

  const out: { id: string; name: string; dob: string; branch_id: string; photo_url: string | null; in_days: number; date: string }[] = [];
  for (const s of students) {
    if (!isDay(s.dob)) continue;
    const hit = window.get(s.dob.slice(5, 10));
    if (!hit) continue;
    out.push({ id: s.id, name: s.name, dob: s.dob!, branch_id: s.branch_id, photo_url: s.photo_url, ...hit });
  }
  return out.sort((a, b) => a.in_days - b.in_days || a.name.localeCompare(b.name));
}

export type BirthdayRunResult = {
  ran: boolean;
  reason?: string;
  birthdays: number;
  sent: number;
  failed: number;
  skipped: number;      // already wished today — the idempotency guard doing its job
};

const idle = (reason: string): BirthdayRunResult =>
  ({ ran: false, reason, birthdays: 0, sent: 0, failed: 0, skipped: 0 });

/**
 * Send today's birthday wishes for one academy. Idempotent: safe to call from the cron,
 * the dashboard, and both at once.
 */
export async function runBirthdayGreetings(academy_id: string, day = todayStr()): Promise<BirthdayRunResult> {
  const settings = await getBirthdaySettings(academy_id);
  if (!settings.enabled) return idle("Birthday wishes are turned off for this academy.");

  const plan = await getPlanForAcademy(academy_id);
  if (!plan.features?.messaging) return idle("Automatic messaging is not included in this academy's plan.");

  const students = await birthdaysOn(academy_id, day);
  if (!students.length) return { ran: true, birthdays: 0, sent: 0, failed: 0, skipped: 0 };

  // Fails in milliseconds when the academy has not connected WhatsApp (or its token has
  // expired), rather than after walking the recipient list — same order as the broadcast.
  const credentials = await whatsappIntegrationService.getCredentials(academy_id);
  if (!credentials.ok) return idle(credentials.error);

  const academy = await prisma.academy.findUnique({ where: { id: academy_id }, select: { name: true } });
  const academyName = academy?.name || "your academy";
  const created_at = nowIso();

  // Build the (student, phone) targets. Dedupe by phone within a student — a parent listed
  // as both the emergency contact and the student's own number gets one message, not two.
  type Target = { student_id: string; name: string; phone: string };
  const targets: Target[] = [];
  for (const s of students) {
    const raw: (string | null)[] = [];
    if (settings.recipient_type === "STUDENTS" || settings.recipient_type === "BOTH") raw.push(s.phone);
    if (settings.recipient_type === "PARENTS" || settings.recipient_type === "BOTH") raw.push(s.emergency_contact);
    const seen = new Set<string>();
    for (const r of raw) {
      const phone = toE164(r);
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      targets.push({ student_id: s.id, name: s.name, phone });
    }
  }
  if (!targets.length) return { ran: true, birthdays: students.length, sent: 0, failed: 0, skipped: 0 };

  // CLAIM FIRST, send second. createMany + skipDuplicates on the (student, date, phone)
  // unique index means whoever gets here first owns the send; a second run's rows are
  // dropped and it sends nothing. Doing this after the send would leave a window where
  // two runs both send and both then write the log.
  //
  // `run_id` is what makes the claim atomic rather than merely first. Reading back
  // `status: "sending"` would also return rows the OTHER run just inserted — both runs
  // would then send to the same numbers. Reading back our own token cannot.
  const runId = randomUUID();
  await prisma.birthdayWish.createMany({
    data: targets.map(t => ({
      academy_id, student_id: t.student_id, date: day, phone: t.phone,
      status: "sending", run_id: runId, created_at,
    })),
    skipDuplicates: true,
  });
  const claimed = await prisma.birthdayWish.findMany({
    where: { academy_id, date: day, run_id: runId },
    select: { id: true, student_id: true, phone: true },
  });
  const skipped = targets.length - claimed.length;
  if (!claimed.length) return { ran: true, birthdays: students.length, sent: 0, failed: 0, skipped };

  const nameOf = new Map(students.map(s => [s.id, s.name]));
  let sent = 0, failed = 0, authError = false;
  for (const c of claimed) {
    const message = renderBirthdayMessage(settings.message, {
      name: nameOf.get(c.student_id) || "there",
      academy: academyName,
    });
    const res = await sendWhatsAppMessage(credentials.phoneNumberId, credentials.accessToken, c.phone, message);
    const error = res.ok ? "" : String(res.error || "").slice(0, 300);
    if (res.ok) sent++;
    else {
      failed++;
      if (res.authError) authError = true;
      console.error(`[birthdays] send failed to ${c.phone}: ${error}`);
    }
    await prisma.birthdayWish.update({
      where: { id: c.id },
      data: { status: res.ok ? "sent" : "failed", error },
    }).catch(() => {});
  }
  // Meta rejected the academy's token mid-run — flip the integration so the next attempt
  // fails fast with "reconnect" instead of silently failing every recipient again.
  if (authError) await whatsappIntegrationService.markExpired(academy_id).catch(() => {});

  await prisma.birthdayGreeting.updateMany({ where: { academy_id }, data: { last_run_date: day, updated_at: created_at } });

  // Messages went out on the academy's own number with nobody pressing send, so the owner
  // gets to see that in the audit trail. Written directly rather than through audit()
  // because the actor is the system — there is no user on either trigger path.
  if (sent || failed) {
    await prisma.auditLog.create({ data: {
      academy_id, actor_id: "system", actor_name: "Auto-birthday-wishes",
      action: "birthday_greeting.send", entity: "birthday_wish", entity_id: day,
      meta: { date: day, birthdays: students.length, sent, failed, skipped }, created_at,
    } }).catch(() => {});
  }

  return { ran: true, birthdays: students.length, sent, failed, skipped };
}

/** `runBirthdayGreetings` for a read path: never throws. A dashboard must still render. */
export const runBirthdayGreetingsSafely = (academy_id: string, day?: string): Promise<BirthdayRunResult> =>
  runBirthdayGreetings(academy_id, day).catch(e => idle(String(e?.message || e)));
