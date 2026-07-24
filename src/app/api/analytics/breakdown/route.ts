export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail, todayStr } from "@/lib/api";
import { feeStatusFor, anchoredDueDate } from "@/lib/fees";
import { accrueFeesSafely } from "@/lib/billing";
import { fmtDay, fmtMonth } from "@/lib/date";

// The rows BEHIND a dashboard tile. `/analytics/dashboard` answers "how many"; this
// answers "which ones" — it is what a tile shows when you click it.
//
// One route, one uniform item shape, so a single modal can render any metric:
//   { id, title, subtitle, value, tone? }
// `tone` is a status word (good | warn | crit), never a colour — the client owns the
// palette. Do not send hex from the server.
//
// Fee status and due dates are DERIVED here, with the student, per invariant 10. The
// browser cannot compute them: it would need every student's admission date, and the
// stored status column lies about rows that went overdue by the clock.

const CAP = 200;   // a tile is a drill-down, not an export — the real lists have their own pages

type Item = { id: string; title: string; subtitle: string; value: string; tone?: "good" | "warn" | "crit" };

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

export async function GET(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const aid = a.user.academy_id;
  const metric = new URL(req.url).searchParams.get("metric") || "";
  const today = todayStr();

  // Name lookups. Every metric needs at least one of these, so resolve them once.
  const names = async () => {
    const [students, branches, users] = await Promise.all([
      prisma.student.findMany({ where: { academy_id: aid }, select: { id: true, name: true, branch_id: true, phone: true, monthly_fee: true, admission_date: true, join_date: true, status: true } }),
      prisma.branch.findMany({ where: { academy_id: aid }, select: { id: true, name: true } }),
      prisma.user.findMany({ where: { academy_id: aid }, select: { id: true, name: true } }),
    ]);
    return {
      students,
      studentById: new Map(students.map(s => [s.id, s])),
      branchById: new Map(branches.map(b => [b.id, b.name])),
      userById: new Map(users.map(u => [u.id, u.name])),
      branches,
    };
  };

  let title = "";
  let items: Item[] = [];

  switch (metric) {
    case "students": {
      const { students, branchById } = await names();
      title = "Students";
      items = students.filter(s => s.status === "active").map(s => ({
        id: s.id, title: s.name,
        subtitle: [branchById.get(s.branch_id) || "—", s.phone].filter(Boolean).join(" · "),
        value: s.monthly_fee ? `${inr(s.monthly_fee)}/mo` : "",
      }));
      break;
    }

    case "trainers": {
      const { branchById } = await names();
      const trainers = await prisma.user.findMany({
        where: { academy_id: aid, role: "trainer", status: "active" },
        select: { id: true, name: true, email: true, phone: true, branch_id: true, branch_ids: true },
      });
      title = "Trainers";
      items = trainers.map(t => {
        const ids = t.branch_ids?.length ? t.branch_ids : t.branch_id ? [t.branch_id] : [];
        const where = ids.map(id => branchById.get(id)).filter(Boolean).join(", ");
        return { id: t.id, title: t.name, subtitle: t.email || t.phone || "—", value: where || "No branch" };
      });
      break;
    }

    case "branches": {
      const { students, branches } = await names();
      title = "Branches";
      items = branches.map(b => {
        const n = students.filter(s => s.branch_id === b.id && s.status === "active").length;
        return { id: b.id, title: b.name, subtitle: `${n} student${n === 1 ? "" : "s"}`, value: "" };
      });
      break;
    }

    case "classes": {
      const { branchById, userById } = await names();
      const dow = (new Date().getDay() + 6) % 7;                 // Mon = 0, as everywhere else
      const rows = await prisma.schedule.findMany({
        where: { academy_id: aid, day_of_week: dow },
        orderBy: { start_time: "asc" },
      });
      title = "Classes today";
      items = rows.map(s => ({
        id: s.id, title: s.title,
        subtitle: [branchById.get(s.branch_id), s.trainer_id ? userById.get(s.trainer_id) : "Unassigned"].filter(Boolean).join(" · "),
        value: `${s.start_time}–${s.end_time}`,
      }));
      break;
    }

    case "attendance": {
      const { studentById, branchById } = await names();
      const rows = await prisma.attendance.findMany({ where: { academy_id: aid, date: today } });
      title = `Attendance — ${fmtDay(today)}`;
      items = rows.map(r => ({
        id: r.id,
        title: studentById.get(r.student_id)?.name || "Unknown student",
        subtitle: branchById.get(r.branch_id) || "—",
        value: r.status,
        tone: r.status === "present" ? "good" : r.status === "late" ? "warn" : "crit",
      }));
      // Present first, then late, then absent — the exceptions end up together at the bottom.
      const rank = { present: 0, late: 1, absent: 2 } as Record<string, number>;
      items.sort((x, y) => (rank[x.value] ?? 3) - (rank[y.value] ?? 3) || x.title.localeCompare(y.title));
      break;
    }

    case "collected":
    case "month": {
      const { studentById } = await names();
      const thisMonth = metric === "month";
      const rows = await prisma.payment.findMany({
        where: { academy_id: aid, ...(thisMonth ? { paid_date: { startsWith: today.slice(0, 7) } } : {}) },
        orderBy: { paid_date: "desc" },
        take: CAP,
      });
      title = thisMonth ? `Payments — ${fmtMonth(today)}` : "Payments — all time";
      items = rows.map(p => ({
        id: p.id,
        title: studentById.get(p.student_id)?.name || "Unknown student",
        subtitle: `${fmtDay(p.paid_date)} · ${p.method}`,
        value: inr(p.amount),
        tone: "good",
      }));
      break;
    }

    case "pending":
    case "overdue": {
      // The tile that opened this modal accrued first; do it here too so a drill-down
      // opened from a stale page still lists the same rows the tile counted.
      await accrueFeesSafely(aid, today);
      const { studentById } = await names();
      const fees = await prisma.fee.findMany({ where: { academy_id: aid } });
      const want = metric;                                       // "pending" | "overdue"
      const matched = fees
        .map(f => {
          const s = studentById.get(f.student_id);
          return { f, s, status: feeStatusFor(f, s, today), due: anchoredDueDate(f, s) };
        })
        .filter(r => r.status === want)
        .sort((x, y) => (x.due || "").localeCompare(y.due || ""));   // oldest debt first

      title = want === "overdue" ? "Overdue fees" : "Pending fees";
      items = matched.slice(0, CAP).map(({ f, s, due }) => ({
        id: f.id,
        title: s?.name || "Unknown student",
        subtitle: `${fmtMonth(f.month)} · due ${fmtDay(due)}`,
        value: inr(f.amount - f.paid_amount),
        tone: want === "overdue" ? "crit" : "warn",
      }));
      break;
    }

    default:
      return fail(400, "Unknown metric");
  }

  return json({ metric, title, total: items.length, items: items.slice(0, CAP) });
}
