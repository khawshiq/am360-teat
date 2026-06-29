export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken, stripPassword } from "@/lib/auth";
import { json, fail, nowIso, uuid } from "@/lib/api";

export async function POST(req: Request) {
  const b = await req.json();
  if (await prisma.user.findUnique({ where: { email: b.email } }))
    return fail(400, "Email already registered");
  const academy_id = uuid(), user_id = uuid();
  await prisma.academy.create({ data: { id: academy_id, name: b.academy_name, logo_base64: null, description: "", owner_id: user_id, created_at: nowIso() } });
  const user = await prisma.user.create({ data: {
    id: user_id, academy_id, name: b.owner_name, email: b.email,
    password: hashPassword(b.password), role: "owner", branch_id: null, branch_ids: [], phone: "", created_at: nowIso(),
  } });
  return json({ access_token: createToken(user_id, "owner", academy_id), user: stripPassword(user) });
}
