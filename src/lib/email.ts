// Minimal email sender using the Resend REST API (no SDK dependency).
// Configure RESEND_API_KEY and EMAIL_FROM (e.g. "AM360 <no-reply@yourdomain.com>")
// in your Vercel project env. EMAIL_FROM must use a domain verified in Resend.
export async function sendEmail({ to, subject, html, text }: {
  to: string; subject: string; html: string; text?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("Email is not configured (RESEND_API_KEY / EMAIL_FROM)");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, ...(text ? { text } : {}) }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${detail}`);
  }
}

export function resetEmailHtml(link: string) {
  return `
  <div style="font-family:'Inter',system-ui,Segoe UI,Arial,sans-serif;background:#0a0a0e;padding:32px 16px;color:#f4f4f7">
    <div style="max-width:440px;margin:0 auto;background:#131319;border:1px solid #1e1e26;border-radius:18px;padding:28px">
      <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;margin-bottom:20px">AM <span style="color:#17d1b4">360</span></div>
      <div style="font-size:18px;font-weight:700;margin-bottom:10px">Reset your password</div>
      <p style="color:#9d9daf;margin:0 0 22px;line-height:1.55">We received a request to reset your AM360 password. Click the button below to choose a new one. This link expires in 1 hour.</p>
      <a href="${link}" style="display:inline-block;background:#6d5eea;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Reset password</a>
      <p style="color:#9d9daf;font-size:13px;line-height:1.5;margin:22px 0 0">Or paste this link into your browser:<br>
        <a href="${link}" style="color:#17d1b4;word-break:break-all">${link}</a></p>
      <p style="color:#6a6a7a;font-size:13px;margin:20px 0 0">If you didn't request this, you can safely ignore this email — your password won't change.</p>
    </div>
  </div>`;
}

export function resetEmailText(link: string) {
  return [
    "Reset your AM360 password",
    "",
    "We received a request to reset your password. Open the link below to choose a new one. It expires in 1 hour.",
    "",
    link,
    "",
    "If you didn't request this, you can safely ignore this email — your password won't change.",
  ].join("\n");
}
