export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, json, fail, nowIso, trainerBranchIds } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const b = await req.json();
  if (u.role === "trainer" && !trainerBranchIds(u).includes(b.branch_id))
    return fail(403, "Cannot mark attendance for other branches");
  await prisma.attendance.deleteMany({ where: { academy_id: u.academy_id, branch_id: b.branch_id, date: b.date } });
  const docs = (b.records || []).map((r: any) => ({
    academy_id: u.academy_id, branch_id: b.branch_id, student_id: r.student_id, date: b.date,
    status: r.status || "absent", marked_by: u.id, marked_at: nowIso(),
  }));
  if (docs.length) await prisma.attendance.createMany({ data: docs });
  const photos = (b.photos || []).slice(0, 2);
  await prisma.classSession.upsert({
    where: { academy_id_branch_id_date: { academy_id: u.academy_id, branch_id: b.branch_id, date: b.date } },
    update: { photos, notes: b.notes || "", marked_by: u.id, marked_at: nowIso() },
    create: { academy_id: u.academy_id, branch_id: b.branch_id, date: b.date, photos, notes: b.notes || "", marked_by: u.id, marked_at: nowIso() },
  });
  await audit(u, "attendance.mark", "classSession", `${b.branch_id}:${b.date}`, { count: docs.length, photos: photos.length });
  return json({ ok: true, count: docs.length, photos: photos.length });
}
