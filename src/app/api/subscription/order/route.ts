export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail, nowIso, uuid } from "@/lib/api";
import { isPaidPlan, normalizeCode } from "@/lib/plan";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";

// Start a subscription purchase: validate plan + duration, price it from the Plan
// row, create a Razorpay order, and record a pending Subscription. Owner/admin only.
export async function POST(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  if (!razorpayConfigured()) return fail(503, "Online payment is not configured. Please contact support.");

  const b = await req.json().catch(() => ({}));
  const plan_code = normalizeCode(b.plan_code);
  const months = Math.max(1, Math.min(12, parseInt(b.months, 10) || 0));
  if (!isPaidPlan(plan_code)) return fail(400, "Choose a paid plan (Basic, Pro or Enterprise).");
  if (!months) return fail(400, "Choose a duration between 1 and 12 months.");

  const plan = await prisma.plan.findUnique({ where: { code: plan_code } });
  if (!plan) return fail(400, "Unknown plan.");

  // 12 months bills at the (discounted) yearly price when set; otherwise monthly × N.
  const amount = months === 12 && plan.price_yearly > 0 ? plan.price_yearly : plan.price_monthly * months;
  if (amount <= 0) return fail(400, "This plan has no price configured yet.");

  const sub_id = uuid();
  let order;
  try {
    order = await createOrder(amount, sub_id, { academy_id: a.user.academy_id, plan: plan_code, months: String(months) });
  } catch (e: any) {
    console.error("[subscription/order] razorpay error:", e);
    return fail(502, "Could not start payment. Please try again.");
  }

  await prisma.subscription.create({ data: {
    id: sub_id, academy_id: a.user.academy_id, plan_code, months, amount, currency: "INR",
    status: "created", razorpay_order_id: order.id, created_at: nowIso(),
  } });

  return json({
    order_id: order.id,
    amount: order.amount,        // paise
    currency: order.currency,
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    plan: { code: plan.code, name: plan.name },
    months,
  });
}
