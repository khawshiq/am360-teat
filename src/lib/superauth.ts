import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import { hashPassword, verifyPassword } from "./auth";
import { fail, nowIso } from "./api";

const JWT_EXP = "7d";
const PLATFORM_SENTINEL = "*platform*"; // used as academy_id in the token for a super admin

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set");
  return s;
}

export function createPlatformToken(sub: string): string {
  return jwt.sign({ sub, role: "superadmin", academy_id: PLATFORM_SENTINEL }, secret(), { expiresIn: JWT_EXP });
}

// Env-based bootstrap: the first login with credentials matching SUPERADMIN_EMAIL /
// SUPERADMIN_PASSWORD seeds the PlatformUser row. Subsequent logins verify the hash.
export async function authenticateSuperAdmin(email: string, password: string) {
  let sa = await prisma.platformUser.findUnique({ where: { email } });
  if (!sa) {
    const envEmail = process.env.SUPERADMIN_EMAIL;
    const envPass = process.env.SUPERADMIN_PASSWORD;
    if (envEmail && envPass && email === envEmail && password === envPass) {
      sa = await prisma.platformUser.create({ data: {
        email, name: process.env.SUPERADMIN_NAME || "Super Admin",
        password: hashPassword(password), created_at: nowIso(),
      } });
    }
  }
  if (!sa || !verifyPassword(password, sa.password)) return null;
  return sa;
}

export async function getPlatformUser(req: Request): Promise<any | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  let payload: any;
  try { payload = jwt.verify(token, secret()); } catch { return null; }
  if (payload.role !== "superadmin") return null;
  const sa = await prisma.platformUser.findUnique({ where: { id: payload.sub } });
  if (!sa) return null;
  const { password, ...rest } = sa as any;
  return rest;
}

// Route guard, mirroring api.ts `auth`/`adminAuth` shape.
export async function superAuth(req: Request) {
  const user = await getPlatformUser(req);
  if (!user) return { error: fail(401, "Super admin privileges required") };
  return { user };
}
