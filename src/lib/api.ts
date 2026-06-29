import { NextResponse } from "next/server";
import { getUser } from "./auth";

export const json = (data: any, status = 200) => NextResponse.json(data, { status });
export const fail = (status: number, detail: string) =>
  NextResponse.json({ detail }, { status });

export const nowIso = () => new Date().toISOString();
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const uuid = () => crypto.randomUUID();

export function trainerBranchIds(user: any): string[] {
  if (user.branch_ids?.length) return user.branch_ids;
  return user.branch_id ? [user.branch_id] : [];
}

export async function auth(req: Request) {
  const user = await getUser(req);
  if (!user) return { error: fail(401, "Unauthorized") };
  return { user };
}
export async function adminAuth(req: Request) {
  const user = await getUser(req);
  if (!user) return { error: fail(401, "Unauthorized") };
  if (!["owner", "admin"].includes(user.role))
    return { error: fail(403, "Admin privileges required") };
  return { user };
}
