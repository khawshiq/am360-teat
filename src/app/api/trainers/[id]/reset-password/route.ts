export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const temp = Math.random().toString(36).slice(-10);
  const res = await prisma.user.updateMany({
    where: { id: params.id, academy_id: a.user.academy_id, role: "trainer" },
    data: { password: hashPassword(temp), must_change_password: true },
  });
  if (res.count === 0) return fail(404, "Trainer not found");
  await audit(a.user, "trainer.reset_password", "user", params.id);
  return json({ ok: true, temp_password: temp }); // owner shares this with the trainer
}
