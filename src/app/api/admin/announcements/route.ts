export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { json, fail, nowIso } from "@/lib/api";
import { superAuth } from "@/lib/superauth";

export async function GET(req: Request) {
  const a = await superAuth(req); if (a.error) return a.error;
  return json(await prisma.announcement.findMany({ orderBy: { created_at: "desc" }, take: 100 }));
}

// Broadcast (academy_id null) or target a single academy.
export async function POST(req: Request) {
  const a = await superAuth(req); if (a.error) return a.error;
  const b = await req.json();
  if (!b.title || !b.body) return fail(400, "Title and body are required");
  const ann = await prisma.announcement.create({ data: {
    title: b.title, body: b.body, academy_id: b.academy_id || null,
    created_by: a.user.name, created_at: nowIso(),
  } });
  return json(ann);
}
