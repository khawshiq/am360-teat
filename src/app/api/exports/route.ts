export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, fail, todayStr, trainerBranchIds, planError } from "@/lib/api";
import { assertFeature } from "@/lib/plan";
import { anchoredDueDate, feeStatusFor } from "@/lib/fees";
import { fmtDay, fmtMonth } from "@/lib/date";
import { buildXlsx, type Column } from "@/lib/xlsx";
import { buildPdf } from "@/lib/pdf";
import { audit } from "@/lib/audit";

// Exports for students / attendance / fees, in CSV, Excel or PDF.
//
// Generated on the SERVER, on purpose. The old CSV was built in the browser from
// whatever the fees tab happened to have loaded, which meant: no academy name (the
// browser doesn't have it on that screen), no derived fee status (invariant 10 needs
// the student), and a different code path per format. One route, one dataset, three
// renderers — so the PDF, the spreadsheet and the CSV can never disagree.
//
// CSV stays free. Excel and PDF are branded, formatted documents, and they are what
// `Plan.features.export` was always for — the flag has existed since the plan ladder
// was written and nothing read it until now.

type Row = Record<string, any>;

const CSV_CELL = (v: any) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user;
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") || "";
  const format = (sp.get("format") || "csv").toLowerCase();
  const branchId = sp.get("branch_id") || "";
  const date = sp.get("date") || todayStr();

  if (!["students", "attendance", "fees"].includes(type)) return fail(400, "Unknown export type");
  if (!["csv", "xlsx", "pdf"].includes(format)) return fail(400, "Unknown format");

  if (format !== "csv") {
    try { await assertFeature(u.academy_id, "export", "Excel and PDF export"); }
    catch (e) { const r = planError(e); if (r) return r; throw e; }
  }

  // Scope. A trainer only ever sees their own branches — and asking for someone
  // else's branch_id yields an empty branch list, not someone else's students.
  const allowed = u.role === "trainer" ? trainerBranchIds(u) : null;
  if (allowed && branchId && !allowed.includes(branchId)) return fail(404, "Branch not found");
  const branchFilter: any = branchId ? { branch_id: branchId } : allowed ? { branch_id: { in: allowed } } : {};

  const [academy, branches] = await Promise.all([
    prisma.academy.findUnique({ where: { id: u.academy_id }, select: { name: true } }),
    prisma.branch.findMany({ where: { academy_id: u.academy_id }, select: { id: true, name: true } }),
  ]);
  const branchById = new Map(branches.map(b => [b.id, b.name]));
  const scope = branchId ? (branchById.get(branchId) || "Branch") : "All branches";

  let title = "";
  let columns: Column[] = [];
  let rows: Row[] = [];

  if (type === "students") {
    const students = await prisma.student.findMany({
      where: { academy_id: u.academy_id, status: "active", ...branchFilter },
      orderBy: { name: "asc" },
    });
    title = "Students";
    columns = [
      { key: "name", label: "Name" },
      { key: "parent", label: "Parent" },
      { key: "phone", label: "Phone" },
      { key: "branch", label: "Branch" },
      { key: "batch", label: "Batch" },
      { key: "course", label: "Course" },
      { key: "fee", label: "Monthly Fee", type: "money" },
      { key: "admitted", label: "Admitted" },
    ];
    rows = students.map(s => ({
      name: s.name, parent: s.parent_name, phone: s.phone,
      branch: branchById.get(s.branch_id) || "—",
      batch: s.batch, course: s.course,
      fee: s.monthly_fee || 0,
      admitted: fmtDay(s.admission_date || s.join_date),
    }));
  }

  if (type === "attendance") {
    const [recs, students] = await Promise.all([
      prisma.attendance.findMany({ where: { academy_id: u.academy_id, date, ...branchFilter } }),
      prisma.student.findMany({ where: { academy_id: u.academy_id }, select: { id: true, name: true } }),
    ]);
    const nameById = new Map(students.map(s => [s.id, s.name]));
    title = `Attendance — ${fmtDay(date)}`;
    columns = [
      { key: "name", label: "Student" },
      { key: "branch", label: "Branch" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
    ];
    rows = recs
      .map(r => ({
        name: nameById.get(r.student_id) || "Unknown student",
        branch: branchById.get(r.branch_id) || "—",
        date: fmtDay(r.date),
        status: r.status,
      }))
      .sort((x, y) => x.name.localeCompare(y.name));
  }

  if (type === "fees") {
    const students = await prisma.student.findMany({
      where: { academy_id: u.academy_id, ...branchFilter },
      select: { id: true, name: true, branch_id: true, admission_date: true, join_date: true },
    });
    const byId = new Map(students.map(s => [s.id, s]));
    const fees = await prisma.fee.findMany({
      where: { academy_id: u.academy_id, student_id: { in: students.map(s => s.id) } },
      include: { payments: { orderBy: { paid_date: "desc" } } },
    });
    title = "Fees";
    columns = [
      { key: "name", label: "Student" },
      { key: "branch", label: "Branch" },
      { key: "month", label: "Month" },
      { key: "amount", label: "Amount", type: "money" },
      { key: "paid", label: "Paid", type: "money" },
      { key: "outstanding", label: "Outstanding", type: "money" },
      { key: "status", label: "Status" },
      { key: "due", label: "Fee Due" },
      { key: "last", label: "Last Paid" },
    ];
    rows = fees
      .map(f => {
        const s = byId.get(f.student_id);
        const lastPaid = f.payments[0]?.paid_date || "";
        return {
          _sort: `${s?.name || ""}|${f.month}`,
          name: s?.name || "Unknown student",
          branch: s ? branchById.get(s.branch_id) || "—" : "—",
          month: fmtMonth(f.month),
          amount: f.amount || 0,
          paid: f.paid_amount || 0,
          outstanding: Math.max(0, (f.amount || 0) - (f.paid_amount || 0)),
          // Derived, never read off the row — invariant 10.
          status: feeStatusFor(f, s),
          due: fmtDay(anchoredDueDate(f, s)),
          last: lastPaid ? fmtDay(lastPaid) : "—",
        };
      })
      .sort((x, y) => x._sort.localeCompare(y._sort))
      .map(({ _sort, ...r }) => r);
  }

  const academyName = academy?.name || "Academy";
  const subtitle = `${scope} · ${rows.length} record${rows.length === 1 ? "" : "s"} · Generated ${fmtDay(todayStr())}`;
  const stamp = todayStr();
  const slug = academyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "academy";
  const base = `${slug}-${type}-${stamp}`;

  if (format === "xlsx") {
    await audit(u, "export.xlsx", "export", type, { rows: rows.length, branch: scope });
    return file(buildXlsx({ academy: academyName, title, subtitle, columns, rows }),
      `${base}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }

  if (format === "pdf") {
    await audit(u, "export.pdf", "export", type, { rows: rows.length, branch: scope });
    // Five-plus columns will not breathe on a portrait page — turn it sideways.
    const pdf = buildPdf({ academy: academyName, title, subtitle, columns, rows, landscape: columns.length > 5 });
    return file(pdf, `${base}.pdf`, "application/pdf");
  }

  // CSV carries the same letterhead as the other two, then a blank line, then the
  // grid — so a spreadsheet still parses it and a human still knows what they opened.
  const lines = [
    [academyName], [title], [subtitle], [],
    columns.map(c => c.label),
    ...rows.map(r => columns.map(c => r[c.key])),
  ];
  const csv = "﻿" + lines.map(l => l.map(CSV_CELL).join(",")).join("\r\n");
  await audit(u, "export.csv", "export", type, { rows: rows.length, branch: scope });
  return file(Buffer.from(csv, "utf8"), `${base}.csv`, "text/csv; charset=utf-8");
}

function file(buf: Buffer, filename: string, contentType: string) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "no-store",
    },
  });
}
