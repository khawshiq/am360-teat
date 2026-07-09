export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, adminAuth, json, fail } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const academy = await prisma.academy.findUnique({ where: { id: a.user.academy_id } });
  if (!academy) return fail(404, "Academy not found");
  return json(academy);
}
export async function PUT(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const b = await req.json();
  const data: any = {};
  // Owners/admins may edit their academy profile only. Subscription fields
  // (plan/status/expiry) are deliberately NOT accepted here — a customer must not
  // be able to self-upgrade. Those are managed exclusively by the Super Admin.
  for (const k of ["name", "logo_url", "description"]) if (b[k] != null) data[k] = b[k];
  await prisma.academy.update({ where: { id: a.user.academy_id }, data });
  await audit(a.user, "academy.update", "academy", a.user.academy_id);
  return json(await prisma.academy.findUnique({ where: { id: a.user.academy_id } }));
}
