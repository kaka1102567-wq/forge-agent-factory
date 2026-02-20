import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma v7 requires adapter or accelerateUrl — lazy init để tránh crash lúc build
// Runtime sẽ hoạt động khi có DATABASE_URL + adapter đúng
function createPrismaClient(): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)() as PrismaClient;
}

// Lazy singleton — chỉ tạo PrismaClient khi thực sự dùng
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return Reflect.get(globalForPrisma.prisma, prop);
  },
});
