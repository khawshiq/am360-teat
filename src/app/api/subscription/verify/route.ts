export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { adminAuth, json, fail, nowIso } from "@/lib/api";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { audit } from "@/lib/audit";

// Confirm a Razorpay payment: verify the signature, activate the subscription, and
// flip the academy onto the paid plan with a start/end period. Owner/admin only.
export async function POST(req: Request) {
  const a = await adminAuth(req); if (a.error) return a.error;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json().catch(() => ({}));
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return fail(400, "Missing payment details.");

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature))
    return fail(400, "Payment verification failed.");

  // Match the pending order to THIS academy — never trust the client's plan/amount.
  const sub = await prisma.subscription.findFirst({
    where: { razorpay_order_id, academy_id: a.user.academy_id },
  });
  if (!sub) return fail(404, "Subscription order not found.");
  if (sub.status === "active") return json({ ok: true, already: true });

  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + sub.months);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  await prisma.subscription.update({ where: { id: sub.id }, data: {
    status: "active", razorpay_payment_id, start_date: startIso, end_date: endIso,
  } });
  await prisma.academy.update({ where: { id: a.user.academy_id }, data: {
    subscription_plan: sub.plan_code, subscription_status: "active",
    subscription_started: startIso, subscription_expires: endIso,
  } });
  await audit(a.user, "subscription.activate", "subscription", sub.id, { plan: sub.plan_code, months: sub.months, amount: sub.amount });

  return json({ ok: true, plan: sub.plan_code, start: startIso, end: endIso });
}
