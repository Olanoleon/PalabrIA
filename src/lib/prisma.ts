import { PrismaClient } from "@/generated/prisma";

// Next dev reloads modules on every edit; without the global cache each reload
// would open a fresh pool and exhaust Neon's connection limit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
