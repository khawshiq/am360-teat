import crypto from "crypto";

// Razorpay integration via REST (no SDK dependency). Configure in Vercel env:
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET      (server, secret)
//   NEXT_PUBLIC_RAZORPAY_KEY_ID               (client checkout — same key id)
function keys() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
  return { id, secret };
}

export const razorpayConfigured = () =>
  !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

// Create an order. `amountMajor` is in rupees; Razorpay wants paise (integer).
export async function createOrder(amountMajor: number, receipt: string, notes: Record<string, string> = {}) {
  const { id, secret } = keys();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amountMajor * 100),
      currency: "INR",
      receipt,
      notes,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Razorpay order failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<{ id: string; amount: number; currency: string }>;
}

// Verify the checkout signature: HMAC_SHA256(order_id|payment_id, key_secret) === signature.
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const { secret } = keys();
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
