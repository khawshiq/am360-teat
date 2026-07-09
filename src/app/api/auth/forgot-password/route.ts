export const runtime = "nodejs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth";
import { json, nowIso, uuid } from "@/lib/api";
import { sendEmail, resetEmailHtml, resetEmailText } from "@/lib/email";

// Build an absolute site origin. Prefer the request's Origin header; fall back to
// Vercel's forwarded host/proto, then to a configured URL. Guarantees the reset
// link in the email is absolute (a relative link would be dead in an inbox).
function baseUrl(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.headers.get("host");
  if (host) return `${req.headers.get("x-forwarded-proto") || "https"}://${host}`;
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
}

// Request a password-reset link. Always responds 200 so the endpoint never
// reveals whether an email is registered.
export async function POST(req: Request) {
  const ok = json({ ok: true });
  const { email } = await req.json().catch(() => ({}));
  if (!email) return ok;

  const user = await prisma.user.findFirst({ where: { email: { equals: String(email), mode: "insensitive" } } });
  if (!user) return ok;

  const raw = crypto.randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  await prisma.passwordResetToken.create({ data: {
    id: uuid(), user_id: user.id, token_hash: hashToken(raw), expires_at, used: false, created_at: nowIso(),
  } });

  const link = `${baseUrl(req)}/reset-password?token=${raw}`;
  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your AM360 password",
      html: resetEmailHtml(link),
      text: resetEmailText(link),
    });
  } catch (e) {
    // Don't leak configuration/errors to the client; log for the operator.
    console.error("[forgot-password] email send failed:", e);
  }
  return ok;
}
