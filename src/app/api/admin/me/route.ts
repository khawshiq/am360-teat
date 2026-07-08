export const runtime = "nodejs";
import { json } from "@/lib/api";
import { superAuth } from "@/lib/superauth";

export async function GET(req: Request) {
  const a = await superAuth(req); if (a.error) return a.error;
  return json(a.user);
}
