export const runtime = "nodejs";
import { json, fail } from "@/lib/api";
import { authenticateSuperAdmin, createPlatformToken } from "@/lib/superauth";

export async function POST(req: Request) {
  const b = await req.json();
  const sa = await authenticateSuperAdmin(b.email || "", b.password || "");
  if (!sa) return fail(401, "Invalid credentials");
  const { password, ...user } = sa as any;
  return json({ access_token: createPlatformToken(sa.id), user });
}
