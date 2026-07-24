export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { json, fail, todayStr } from "@/lib/api";
import { runBirthdayGreetingsSafely } from "@/lib/birthdays";

// The scheduled half of automatic birthday wishes. Vercel Cron hits this once a day (see
// `vercel.json`); it walks every active academy and sends whatever that academy has opted
// into. Deliberately GET, because that is the only verb Vercel Cron issues.
//
// This is the ONLY route in the app not behind a user session, so the guard is different
// in kind: a shared `CRON_SECRET`, compared in constant time, and **no secret means no
// entry** — an unset env var 503s rather than leaving an open endpoint that can message
// every customer of every academy. Vercel sends it as `Authorization: Bearer $CRON_SECRET`
// automatically when the variable exists in the project.
//
// The cron is a convenience, not a dependency: `GET /analytics/dashboard` runs the same
// function for the admin's own academy, so a deployment with no cron configured still
// sends — just at the hour someone first opens the console, rather than a fixed one.
// Both paths are idempotent (see src/lib/birthdays.ts), so having both cannot double-send.

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (got.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= got.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return fail(503, "CRON_SECRET is not configured");
  if (!authorized(req)) return fail(401, "Unauthorized");

  const day = todayStr();
  // Only academies that have actually opted in, so a platform with thousands of tenants
  // does not do a full table walk every night to find the handful using this.
  const optedIn = await prisma.birthdayGreeting.findMany({
    where: { enabled: true },
    select: { academy_id: true },
  });
  const active = new Set((await prisma.academy.findMany({
    where: { id: { in: optedIn.map(o => o.academy_id) }, status: "active" },
    select: { id: true },
  })).map(a => a.id));

  let sent = 0, failed = 0, academies = 0;
  for (const { academy_id } of optedIn) {
    if (!active.has(academy_id)) continue;      // suspended academies send nothing
    const r = await runBirthdayGreetingsSafely(academy_id, day);
    academies++;
    sent += r.sent;
    failed += r.failed;
  }
  return json({ ok: true, date: day, academies, sent, failed });
}
