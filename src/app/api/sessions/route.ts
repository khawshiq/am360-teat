export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, json, fail, trainerBranchIds } from "@/lib/api";

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const sp = new URL(req.url).searchParams;
  const branch_id = sp.get("branch_id")!, date = sp.get("date")!;
  if (u.role === "trainer" && !trainerBranchIds(u).includes(branch_id)) return fail(403, "Access denied");
  const session = await prisma.classSession.findUnique({ where: { academy_id_branch_id_date: { academy_id: u.academy_id, branch_id, date } } });
  return json(session || { photos: [], notes: "" });
}
