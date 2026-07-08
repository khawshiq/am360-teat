export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken, stripPassword } from "@/lib/auth";
import { json, fail } from "@/lib/api";

export async function POST(req: Request) {
  const b = await req.json();
  const user = await prisma.user.findUnique({ where: { email: b.email } });
  if (!user || !verifyPassword(b.password, user.password)) return fail(401, "Invalid credentials");
  const academy = await prisma.academy.findUnique({ where: { id: user.academy_id } });
  if (academy?.status === "suspended") return fail(403, "This academy has been suspended. Please contact support.");
  return json({ access_token: createToken(user.id, user.role, user.academy_id), user: stripPassword(user) });
}
