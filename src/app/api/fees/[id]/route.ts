export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json } from "@/lib/api";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  await prisma.fee.deleteMany({ where: { id: params.id, academy_id: a.user.academy_id } });
  return json({ ok: true });
}
