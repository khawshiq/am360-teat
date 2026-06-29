export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const sp = new URL(req.url).searchParams;
  const branch_id = sp.get("branch_id"); const days = parseInt(sp.get("days") || "7", 10);
  const where: any = { academy_id: u.academy_id };
  if (u.role === "trainer") where.branch_id = u.branch_id; else if (branch_id) where.branch_id = branch_id;
  where.date = { gte: new Date(Date.now() - (days - 1) * 864e5).toISOString().slice(0, 10) };
  const recs = await prisma.attendance.findMany({ where });
  const byDate: Record<string, any> = {};
  for (const r of recs) {
    byDate[r.date] ||= { date: r.date, present: 0, absent: 0, late: 0 };
    byDate[r.date][r.status] = (byDate[r.date][r.status] || 0) + 1;
  }
  return json(Object.values(byDate).sort((x: any, y: any) => x.date.localeCompare(y.date)));
}
