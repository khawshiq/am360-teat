export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const res = await prisma.fee.deleteMany({ where: { id: params.id, academy_id: a.user.academy_id } });
  if (res.count > 0) await audit(a.user, "fee.delete", "fee", params.id);
  return json({ ok: true });
}
