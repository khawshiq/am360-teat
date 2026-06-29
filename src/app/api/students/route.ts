export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, json, fail, nowIso, todayStr, trainerBranchIds } from "@/lib/api";
import { audit } from "@/lib/audit";

const STUDENT_FIELDS = ["name","parent_name","phone","alt_mobile","email","address","dob","gender","admission_date","batch","course","photo_url","emergency_contact","medical_notes","monthly_fee","join_date","notes"];

export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const sp = new URL(req.url).searchParams;
  const branch_id = sp.get("branch_id"); const q = sp.get("q"); const batch = sp.get("batch"); const course = sp.get("course");
  const where: any = { academy_id: u.academy_id };
  if (sp.get("include_inactive") !== "1") where.status = "active";
  if (u.role === "trainer") {
    const bids = trainerBranchIds(u);
    where.branch_id = branch_id && bids.includes(branch_id) ? branch_id : (bids.length ? { in: bids } : "__none__");
  } else if (branch_id) where.branch_id = branch_id;
  if (batch) where.batch = batch;
  if (course) where.course = course;
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { parent_name: { contains: q, mode: "insensitive" } }];
  return json(await prisma.student.findMany({ where, orderBy: { name: "asc" } }));
}
export async function POST(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const b = await req.json();
  if (u.role === "trainer" && !trainerBranchIds(u).includes(b.branch_id))
    return fail(403, "Trainers can only add students to their assigned branches");
  if (!(await prisma.branch.findFirst({ where: { id: b.branch_id, academy_id: u.academy_id } }))) return fail(400, "Invalid branch");
  const data: any = { academy_id: u.academy_id, branch_id: b.branch_id, status: "active", created_at: nowIso(),
    join_date: b.join_date || todayStr(), admission_date: b.admission_date || todayStr() };
  for (const k of STUDENT_FIELDS) if (b[k] != null) data[k] = b[k];
  if (data.monthly_fee == null) data.monthly_fee = 0;
  const student = await prisma.student.create({ data });
  await audit(u, "student.create", "student", student.id, { name: student.name });
  return json(student);
}
