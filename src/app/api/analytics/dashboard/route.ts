export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, todayStr } from "@/lib/api";

export async function GET(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const aid = a.user.academy_id;
  const branches = await prisma.branch.findMany({ where: { academy_id: aid, status: "active" } });
  const total_students = await prisma.student.count({ where: { academy_id: aid, status: "active" } });
  const total_trainers = await prisma.user.count({ where: { academy_id: aid, role: "trainer", status: "active" } });

  const branch_stats = await Promise.all(branches.map(async (b: any) => ({
    branch_id: b.id, name: b.name,
    students: await prisma.student.count({ where: { academy_id: aid, branch_id: b.id, status: "active" } }),
    trainers: await prisma.user.count({ where: { academy_id: aid, role: "trainer", branch_id: b.id, status: "active" } }),
  })));

  const today = todayStr();
  const todayRecs = await prisma.attendance.findMany({ where: { academy_id: aid, date: today } });
  const present_today = todayRecs.filter((r: any) => r.status === "present").length;
  const attendance_rate_today = todayRecs.length ? Math.round((1000 * present_today) / todayRecs.length) / 10 : 0;

  // Today's classes (schedules on today's weekday; Mon=0)
  const dow = (new Date().getDay() + 6) % 7;
  const classes_today = await prisma.schedule.count({ where: { academy_id: aid, day_of_week: dow } });

  const fees = await prisma.fee.findMany({ where: { academy_id: aid } });
  const fee_collected = fees.reduce((s: number, f: any) => s + f.paid_amount, 0);
  const pending = fees.filter((f: any) => f.status === "pending" || f.status === "overdue");
  const fee_pending = pending.reduce((s: number, f: any) => s + (f.amount - f.paid_amount), 0);

  // Monthly revenue = payments recorded this month
  const ym = today.slice(0, 7);
  const monthPayments = await prisma.payment.findMany({ where: { academy_id: aid, paid_date: { startsWith: ym } } });
  const monthly_revenue = monthPayments.reduce((s: number, p: any) => s + p.amount, 0);

  const start = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  const trendRecs = await prisma.attendance.findMany({ where: { academy_id: aid, date: { gte: start } } });
  const trendMap: Record<string, any> = {};
  for (let i = 0; i < 7; i++) { const d = new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10); trendMap[d] = { date: d, present: 0, total: 0 }; }
  for (const r of trendRecs) if (trendMap[r.date]) { trendMap[r.date].total++; if (r.status === "present") trendMap[r.date].present++; }

  const trainers = await prisma.user.findMany({ where: { academy_id: aid, role: "trainer" } });
  const thirty = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const trainer_performance = (await Promise.all(trainers.map(async (t: any) => ({
    id: t.id, name: t.name, branch_ids: t.branch_ids,
    attendance_marks: await prisma.attendance.count({ where: { academy_id: aid, marked_by: t.id, date: { gte: thirty } } }),
  })))).sort((x: any, y: any) => y.attendance_marks - x.attendance_marks).slice(0, 10);

  return json({
    total_students, total_trainers, total_branches: branches.length, classes_today, branch_stats,
    attendance_rate_today, present_today, marked_today: todayRecs.length,
    fee_collected, fee_pending, pending_count: pending.length, monthly_revenue,
    attendance_trend: Object.values(trendMap), trainer_performance,
  });
}
