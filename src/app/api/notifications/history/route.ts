export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const sp = new URL(req.url).searchParams;
  const skip = Math.max(0, parseInt(sp.get("skip") || "0", 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "50", 10) || 50));
  const where = { academy_id: a.user.academy_id };

  const [items, total, branches] = await Promise.all([
    prisma.notificationLog.findMany({ where, orderBy: { created_at: "desc" }, skip, take: limit }),
    prisma.notificationLog.count({ where }),
    prisma.branch.findMany({ where: { academy_id: a.user.academy_id }, select: { id: true, name: true } }),
  ]);
  const branchName: Record<string, string> = Object.fromEntries(branches.map(b => [b.id, b.name]));

  return json({
    items: items.map(i => ({ ...i, branch_name: branchName[i.branch_id] || "—" })),
    total, skip, limit,
  });
}
