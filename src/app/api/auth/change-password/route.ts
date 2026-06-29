export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, json, fail } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const b = await req.json();
  const full = await prisma.user.findUnique({ where: { id: a.user.id } });
  if (!full || !verifyPassword(b.current_password, full.password)) return fail(400, "Current password is incorrect");
  if (!b.new_password || b.new_password.length < 6) return fail(400, "New password must be at least 6 characters");
  await prisma.user.update({ where: { id: a.user.id }, data: { password: hashPassword(b.new_password), must_change_password: false } });
  await audit(a.user, "password.change", "user", a.user.id);
  return json({ ok: true });
}
