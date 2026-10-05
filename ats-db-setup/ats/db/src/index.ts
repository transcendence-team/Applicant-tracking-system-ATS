import { PrismaClient } from "@prisma/client";

// One shared client per process (avoids opening too many DB connections)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export generated types (User, Job, Application, Prisma, ...)
export * from "@prisma/client";
