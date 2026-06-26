import type { Transaction } from "@prisma/client";

export function presentTransaction(transaction: Transaction) {
  return {
    id: transaction.id,
    date: transaction.date.toISOString().slice(0, 10),
    description: transaction.description,
    type: transaction.type,
    amount: Number(transaction.amount),
    currencyCode: transaction.currencyCode,
    balanceAfter: transaction.balanceAfter === null ? null : Number(transaction.balanceAfter),
    category: transaction.category,
    confidence: transaction.confidence,
    status: transaction.status,
    accountLabel: transaction.accountLabel,
    duplicateOfId: transaction.duplicateOfId,
    source: transaction.source,
    importBatchId: transaction.importBatchId,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString()
  };
}
