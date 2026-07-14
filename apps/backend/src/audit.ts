import type { Prisma } from "@prisma/client";
import type { TenantScope } from "./isolation";

type BaseInput = { resourceId: string; requestId: string };
export type AuditEventInput =
  | (BaseInput & { action: "TRANSACTION_CREATE"; metadata: { source: "TEXT" | "CSV" | "MANUAL"; status: "SAVED" | "NEEDS_REVIEW" } })
  | (BaseInput & { action: "TRANSACTION_UPDATE"; metadata: { status: "SAVED" | "NEEDS_REVIEW" } })
  | (BaseInput & { action: "TRANSACTION_DELETE" })
  | (BaseInput & { action: "IMPORT_COMMIT"; metadata: { importedRows: number; skippedRows: number } })
  | (BaseInput & { action: "IMPORT_ROLLBACK"; metadata: { deletedTransactions: number } })
  | (BaseInput & { action: "CATEGORY_RULE_UPSERT" | "CATEGORY_RULE_UPDATE"; metadata: { category: string } })
  | (BaseInput & { action: "CATEGORY_RULE_DELETE" });

const resourceTypes: Record<AuditEventInput["action"], string> = {
  TRANSACTION_CREATE: "transaction", TRANSACTION_UPDATE: "transaction", TRANSACTION_DELETE: "transaction",
  IMPORT_COMMIT: "import_batch", IMPORT_ROLLBACK: "import_batch",
  CATEGORY_RULE_UPSERT: "category_rule", CATEGORY_RULE_UPDATE: "category_rule", CATEGORY_RULE_DELETE: "category_rule"
};

export async function writeAuditEvent(tx: Prisma.TransactionClient, scope: TenantScope, input: AuditEventInput): Promise<void> {
  await tx.auditEvent.create({ data: {
    actorId: scope.userId, organizationId: scope.organizationId, action: input.action,
    resourceType: resourceTypes[input.action], resourceId: input.resourceId, requestId: input.requestId.slice(0, 100),
    metadata: "metadata" in input ? input.metadata : {}
  } });
}
