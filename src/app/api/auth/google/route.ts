export const runtime = "nodejs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createToken, stripPassword, hashPassword } from "@/lib/auth";
import { json, fail, nowIso, uuid } from "@/lib/api";

// Sign in (or self-onboard) with a Google ID token. The client obtains the token
// via Google Identity Services and posts it here. We verify it with Google, then
// either log the matching user in or create a new academy + owner.
export async function POST(req: Request) {
  const { credential } = await req.json();
  if (!credential) return fail(400, "Missing Google credential");

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return fail(500, "Google login is not configured");

  // Verify the ID token against Google (checks signature + expiry server-side).
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );
  if (!res.ok) return fail(401, "Invalid Google token");
  const p: any = await res.json();

  if (p.aud !== clientId) return fail(401, "Google token audience mismatch");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(p.iss))
    return fail(401, "Invalid Google issuer");
  if (p.email_verified !== "true" && p.email_verified !== true)
    return fail(401, "Google email is not verified");

  const email = String(p.email || "").toLowerCase();
  if (!email) return fail(401, "Google account has no email");

  // Case-insensitive match so an account registered as "User@x.com" still works.
  let user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });

  if (user) {
    const academy = await prisma.academy.findUnique({ where: { id: user.academy_id } });
    if (academy?.status === "suspended")
      return fail(403, "This academy has been suspended. Please contact support.");
    return json({ access_token: createToken(user.id, user.role, user.academy_id), user: stripPassword(user) });
  }

  // Unknown email → self-onboard: create a new academy with this person as owner.
  const academy_id = uuid(), user_id = uuid();
  const name = String(p.name || email.split("@")[0]);
  const picture = p.picture || null;
  await prisma.academy.create({ data: {
    id: academy_id, name: `${name}'s Academy`, logo_url: picture, description: "", owner_id: user_id, created_at: nowIso(),
  } });
  user = await prisma.user.create({ data: {
    id: user_id, academy_id, name, email,
    // Random password — this account signs in with Google. It can set a real
    // password later via "Forgot password" if they ever want email login.
    password: hashPassword(crypto.randomBytes(24).toString("hex")),
    role: "owner", branch_id: null, branch_ids: [], phone: "", photo_url: picture, created_at: nowIso(),
  } });
  return json({ access_token: createToken(user_id, "owner", academy_id), user: stripPassword(user) });
}
