export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, json } from "@/lib/api";

// Announcements the caller's academy should see: the platform-wide broadcasts
// (academy_id null) plus any addressed to this academy specifically. Readable by
// every tenant role — an announcement is academy-wide news, not an admin secret.
export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const items = await prisma.announcement.findMany({
    where: { OR: [{ academy_id: null }, { academy_id: a.user.academy_id }] },
    orderBy: { created_at: "desc" },
    take: 50,
  });
  return json(items);
}
