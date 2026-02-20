import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Singleton pattern to prevent multiple Prisma instances in development
// Note: Prisma v7 cần adapter hoặc accelerateUrl — sẽ configure đúng khi setup DB connection
export const db =
  globalForPrisma.prisma ??
  new (PrismaClient as unknown as new () => PrismaClient)();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
