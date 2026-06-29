export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const sp = new URL(req.url).searchParams;
  const take = Math.min(parseInt(sp.get("limit") || "50", 10), 200);
  const skip = parseInt(sp.get("skip") || "0", 10);
  const where = { academy_id: a.user.academy_id };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { created_at: "desc" }, take, skip }),
    prisma.auditLog.count({ where }),
  ]);
  return json({ items, total, skip, limit: take });
}
