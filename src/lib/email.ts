// Minimal email sender using the Resend REST API (no SDK dependency).
// Configure RESEND_API_KEY and EMAIL_FROM (e.g. "AM360 <no-reply@yourdomain.com>")
// in your Vercel project env. EMAIL_FROM must use a domain verified in Resend.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("Email is not configured (RESEND_API_KEY / EMAIL_FROM)");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${detail}`);
  }
}

export function resetEmailHtml(link: string) {
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#08080c;padding:32px;color:#e8e8ee">
    <div style="max-width:440px;margin:0 auto;background:#14141c;border:1px solid #22222e;border-radius:16px;padding:28px">
      <div style="font-size:22px;font-weight:800;margin-bottom:8px">AM <span style="color:#16e0c0">360</span></div>
      <p style="color:#a0a0b0;margin:0 0 20px">Reset your password</p>
      <p style="margin:0 0 20px;line-height:1.5">We received a request to reset your AM360 password. Click the button below to choose a new one. This link expires in 1 hour.</p>
      <a href="${link}" style="display:inline-block;background:#7c6cf0;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Reset password</a>
      <p style="color:#70707e;font-size:13px;margin:22px 0 0">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>`;
}
