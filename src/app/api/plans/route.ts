export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { auth, json } from "@/lib/api";
import { ensurePlansSeeded } from "@/lib/plan";

// Owner/admin-facing plan catalogue (limits + pricing) for the upgrade popup.
export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  await ensurePlansSeeded();
  return json(await prisma.plan.findMany({ orderBy: { price_monthly: "asc" } }));
}
