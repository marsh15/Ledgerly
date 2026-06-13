import type { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import type { TenantScope } from "./isolation";

export type TransactionFilters = {
  search?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  type?: TransactionType | undefined;
  category?: string | undefined;
  status?: TransactionStatus | undefined;
  accountLabel?: string | undefined;
  minConfidence?: number | undefined;
};

export function buildTransactionWhere(scope: TenantScope, filters: TransactionFilters = {}): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {
    userId: scope.userId,
    organizationId: scope.organizationId
  };

  if (filters.search) {
    where.description = { contains: filters.search, mode: "insensitive" };
  }

  if (filters.type) where.type = filters.type;
  if (filters.category) where.category = filters.category;
  if (filters.status) where.status = filters.status;
  if (filters.accountLabel) where.accountLabel = filters.accountLabel;
  if (filters.minConfidence !== undefined) where.confidence = { gte: filters.minConfidence };

  if (filters.dateFrom || filters.dateTo) {
    where.date = {
      ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } : {}),
      ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {})
    };
  }

  return where;
}
