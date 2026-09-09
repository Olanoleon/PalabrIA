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

/**
 * Whether an error is Postgres rejecting a duplicate on a unique index.
 *
 * Shape-checked rather than `instanceof PrismaClientKnownRequestError`: the
 * client is generated into the source tree, and in a bundled server action the
 * class the error carries is not always the same module instance as the one
 * the check imports — so `instanceof` quietly returns false and a friendly
 * message becomes a 500. The error code is stable and does not care which copy
 * of the class threw it.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
