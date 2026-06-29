export const runtime = "nodejs";
import crypto from "crypto";
import { auth, json, fail } from "@/lib/api";

// Client uses the returned signature to upload directly to Cloudinary,
// then sends the resulting secure_url back to our API. Files never hit our DB.
export async function POST(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return fail(500, "Cloudinary env vars not configured");
  const { folder = "am360" } = await req.json().catch(() => ({}));
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(toSign + secret).digest("hex");
  return json({ cloud_name: cloud, api_key: key, timestamp, folder, signature,
    upload_url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload` });
}
