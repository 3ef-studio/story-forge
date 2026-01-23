import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

let prismaClient: PrismaClient | undefined =
  global.__prisma ?? undefined;

/**
 * Lazily create PrismaClient on first actual use.
 * This avoids build-time module evaluation crashes on Vercel/Next.
 */
function getPrisma(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    if (process.env.NODE_ENV !== 'production') {
      global.__prisma = prismaClient;
    }
  }
  return prismaClient;
}

// Proxy preserves the normal `prisma.model.method()` API
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop];
  },
});
