import { PrismaClient } from "@prisma/client";

const g = global as unknown as { _prisma?: PrismaClient };
export const prisma = g._prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g._prisma = prisma;
