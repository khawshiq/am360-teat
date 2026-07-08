export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { json } from "@/lib/api";
import { superAuth } from "@/lib/superauth";

// Platform-wide KPIs for the Super Admin dashboard.
export async function GET(req: Request) {
  const a = await superAuth(req); if (a.error) return a.error;
  const [academies, suspended, premium, owners, trainers, students, payments] = await Promise.all([
    prisma.academy.count(),
    prisma.academy.count({ where: { status: "suspended" } }),
    prisma.academy.count({ where: { subscription_plan: { in: ["premium", "pro"] } } }),
    prisma.user.count({ where: { role: { in: ["owner", "admin"] } } }),
    prisma.user.count({ where: { role: "trainer" } }),
    prisma.student.count(),
    prisma.payment.findMany({ select: { amount: true, paid_date: true } }),
  ]);
  const month = new Date().toISOString().slice(0, 7);
  const revenue_total = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const revenue_month = payments.filter(p => (p.paid_date || "").startsWith(month)).reduce((s, p) => s + (p.amount || 0), 0);
  return json({
    academies, active: academies - suspended, suspended, premium, free: academies - premium,
    owners, trainers, students, revenue_total, revenue_month,
  });
}
