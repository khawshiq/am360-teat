export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { hashPassword, hashToken } from "@/lib/auth";
import { json, fail } from "@/lib/api";

// Complete a password reset using the token from the emailed link.
export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !password) return fail(400, "Missing token or password");
  if (String(password).length < 6) return fail(400, "Password must be at least 6 characters");

  const row = await prisma.passwordResetToken.findFirst({ where: { token_hash: hashToken(String(token)), used: false } });
  if (!row) return fail(400, "Invalid or already-used reset link");
  if (new Date(row.expires_at).getTime() < Date.now()) return fail(400, "This reset link has expired");

  await prisma.user.update({
    where: { id: row.user_id },
    data: { password: hashPassword(String(password)), must_change_password: false },
  });
  await prisma.passwordResetToken.update({ where: { id: row.id }, data: { used: true } });
  return json({ ok: true });
}
