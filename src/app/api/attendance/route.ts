export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, json, fail, trainerBranchIds } from "@/lib/api";

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const sp = new URL(req.url).searchParams;
  const branch_id = sp.get("branch_id")!, date = sp.get("date")!;
  if (u.role === "trainer" && !trainerBranchIds(u).includes(branch_id)) return fail(403, "Access denied");
  return json(await prisma.attendance.findMany({ where: { academy_id: u.academy_id, branch_id, date } }));
}
