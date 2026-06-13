import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { TenantScope } from "./isolation";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "test" ? [] : process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

export async function withTenant<T>(scope: TenantScope, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${scope.organizationId}, true)`;
    return work(tx);
  });
}
