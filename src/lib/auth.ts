import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma";

const JWT_EXP = "7d";

// Password-reset tokens are stored hashed; we compare hashes, never raw tokens.
export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set"); // fail loudly, no insecure fallback
  return s;
}

export const hashPassword = (p: string) => bcrypt.hashSync(p, 10);
export const verifyPassword = (p: string, h: string) => {
  try { return bcrypt.compareSync(p, h); } catch { return false; }
};

export function createToken(sub: string, role: string, academy_id: string): string {
  return jwt.sign({ sub, role, academy_id }, secret(), { expiresIn: JWT_EXP });
}

export function stripPassword<T extends { password?: string }>(u: T) {
  if (!u) return u;
  const { password, ...rest } = u as any;
  return rest;
}

export async function getUser(req: Request): Promise<any | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  let payload: any;
  try { payload = jwt.verify(token, secret()); } catch { return null; }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return user ? stripPassword(user) : null;
}
