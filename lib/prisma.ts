import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;

/**
 * Resilient query wrapper to handle transient database connection wake-ups (e.g. Neon cold starts)
 */
export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 600
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isTransient =
        errMsg.includes("Can't reach database server") ||
        errMsg.includes("Connection terminated unexpectedly") ||
        errMsg.includes("Connection closed") ||
        errMsg.includes("connection limit") ||
        errMsg.includes("Timed out") ||
        errMsg.includes("remaining connection slots") ||
        errMsg.includes("sorry, too many clients already");

      if (attempt < retries && isTransient) {
        console.warn(
          `[Prisma] Transient connection issue detected, retrying attempt ${attempt + 1}/${retries}...`
        );
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

export default prisma;
