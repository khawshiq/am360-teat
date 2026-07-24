export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, adminAuth, json, fail, todayStr } from "@/lib/api";
import { accrueFeesSafely } from "@/lib/billing";
import { audit } from "@/lib/audit";

// `join_date` is editable now. It used to be write-once at create time, so a joining date
// typed wrong could never be corrected — and since it is the fallback billing anchor, the
// student was stuck billing on a day nobody chose.
const EDITABLE = ["name","parent_name","phone","alt_mobile","email","address","dob","gender","admission_date","join_date","batch","course","photo_url","emergency_contact","medical_notes","monthly_fee","notes","status"];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const a = await auth(req); if (a.error) return a.error;
  const u = a.user; const b = await req.json();
  const where: any = { id: params.id, academy_id: u.academy_id };
  if (u.role === "trainer") where.branch_id = u.branch_id;
  const data: any = {};
  for (const k of EDITABLE) if (b[k] != null) data[k] = b[k];
  // Editing one of the two joining-date columns moves the other with it: they are one fact
  // to the user, and the billing anchor reads whichever it finds first. Same rule as create.
  if (data.admission_date && b.join_date == null) data.join_date = data.admission_date;
  else if (data.join_date && b.admission_date == null) data.admission_date = data.join_date;
  const res = await prisma.student.updateMany({ where, data });
  if (res.count === 0) return fail(404, "Student not found");
  await audit(u, "student.update", "student", params.id, data);
  // Giving a student a monthly fee (or reactivating them) makes them billable — raise what
  // they are already due instead of making the owner wait for the next dashboard load.
  if (data.monthly_fee != null || data.status === "active")
    await accrueFeesSafely(u.academy_id, todayStr(), { studentIds: [params.id], actor: u });
  return json(await prisma.student.findUnique({ where: { id: params.id } }));
}
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await adminAuth(req); if (a.error) return a.error;
  await prisma.student.deleteMany({ where: { id: params.id, academy_id: a.user.academy_id } });
  await audit(a.user, "student.delete", "student", params.id);
  return json({ ok: true });
}
