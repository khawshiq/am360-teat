export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { json } from "@/lib/api";
import { resolveTenantOrSuperActor } from "@/lib/tenantOrSuperAuth";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const r = await resolveTenantOrSuperActor(req, sp.get("academyId") || undefined);
  if (r.error) return r.error;
  const { academy_id } = r;

  const skip = Math.max(0, parseInt(sp.get("skip") || "0", 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "50", 10) || 50));
  const where = { academy_id };

  const [items, total, branches] = await Promise.all([
    prisma.notificationLog.findMany({ where, orderBy: { created_at: "desc" }, skip, take: limit }),
    prisma.notificationLog.count({ where }),
    prisma.branch.findMany({ where: { academy_id }, select: { id: true, name: true } }),
  ]);
  const branchName: Record<string, string> = Object.fromEntries(branches.map(b => [b.id, b.name]));

  // Why a message didn't arrive, for the broadcasts on THIS page only. Meta reports a
  // failure per message on the webhook, so without surfacing it here the history can say
  // "9 undelivered" and still leave the admin with no idea why — which is barely better
  // than the "11 ok" it replaced. Bounded to the page's own rows, not the whole table.
  const failures = await prisma.whatsAppMessage.findMany({
    where: { academy_id, notification_id: { in: items.map(i => i.id) }, status: "failed" },
    select: { notification_id: true, error_code: true, error_detail: true },
  });
  const reasons: Record<string, string[]> = {};
  for (const f of failures) {
    const key = f.notification_id!;
    const text = [f.error_detail, f.error_code && `(${f.error_code})`].filter(Boolean).join(" ").trim();
    if (!text) continue;
    const list = (reasons[key] ||= []);
    if (!list.includes(text) && list.length < 3) list.push(text); // distinct, and capped
  }

  return json({
    items: items.map(i => ({
      ...i,
      branch_name: branchName[i.branch_id] || "—",
      // Accepted by Meta but with no outcome reported yet. Normal for a minute or two
      // after sending; permanent if the webhook was never wired up in the Meta dashboard.
      awaiting_count: Math.max(0, i.success_count - i.delivered_count - i.undelivered_count),
      failure_reasons: reasons[i.id] || [],
    })),
    total, skip, limit,
  });
}
