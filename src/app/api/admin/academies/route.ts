export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { json } from "@/lib/api";
import { superAuth } from "@/lib/superauth";

// Platform-wide list of every academy with owner + usage counts.
export async function GET(req: Request) {
  const a = await superAuth(req); if (a.error) return a.error;
  const academies = await prisma.academy.findMany({ orderBy: { created_at: "desc" } });
  const rows = await Promise.all(academies.map(async (ac) => {
    const [owner, branches, trainers, students] = await Promise.all([
      prisma.user.findUnique({ where: { id: ac.owner_id } }),
      prisma.branch.count({ where: { academy_id: ac.id, status: "active" } }),
      prisma.user.count({ where: { academy_id: ac.id, role: "trainer", status: "active" } }),
      prisma.student.count({ where: { academy_id: ac.id, status: "active" } }),
    ]);
    return {
      ...ac,
      owner_name: owner?.name || "—", owner_email: owner?.email || "—",
      counts: { branches, trainers, students },
    };
  }));
  return json(rows);
}
