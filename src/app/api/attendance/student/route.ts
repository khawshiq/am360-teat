export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, json, fail, todayStr, trainerBranchIds } from "@/lib/api";

// One student's attendance for one month — what the "Attendance" action on a student row
// opens. `/attendance` answers "who was in on this day"; this answers "how did this
// student do this month", which is the question a parent actually asks.
//
// Rate is present / marked, NOT present / days-in-month: a day nobody marked the register
// is not a day the student missed, and dividing by 30 would show a perfect attender at
// 40% and make the number useless.

const isMonth = (m: string) => /^\d{4}-\d{2}$/.test(m);

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const sp = new URL(req.url).searchParams;
  const student_id = sp.get("student_id") || "";
  const month = sp.get("month") || todayStr().slice(0, 7);
  if (!student_id) return fail(400, "student_id is required");
  if (!isMonth(month)) return fail(400, "month must be YYYY-MM");

  // Scoped by academy, and by branch for a trainer — a foreign student id touches no rows
  // and reads as a 404, exactly like every other tenant lookup.
  const where: any = { id: student_id, academy_id: u.academy_id };
  if (u.role === "trainer") {
    const bids = trainerBranchIds(u);
    if (!bids.length) return fail(404, "Student not found");
    where.branch_id = { in: bids };
  }
  const student = await prisma.student.findFirst({
    where, select: { id: true, name: true, branch_id: true, admission_date: true, join_date: true },
  });
  if (!student) return fail(404, "Student not found");

  const records = await prisma.attendance.findMany({
    where: { academy_id: u.academy_id, student_id, date: { startsWith: month } },
    select: { date: true, status: true },
    orderBy: { date: "asc" },
  });

  const count = (s: string) => records.filter(r => r.status === s).length;
  const present = count("present"), absent = count("absent"), late = count("late");
  const marked = records.length;
  // Late is attendance, not absence — a student who turned up late was there.
  const attended = present + late;

  return json({
    student: { id: student.id, name: student.name },
    month,
    present, absent, late,
    marked,
    attended,
    rate: marked ? Math.round((1000 * attended) / marked) / 10 : 0,
    days: records,
  });
}
