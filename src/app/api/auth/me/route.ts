export const runtime = "nodejs";
import { auth, json } from "@/lib/api";
export async function GET(req: Request) {
  const a = await auth(req); if (a.error) return a.error;
  return json(a.user);
}
