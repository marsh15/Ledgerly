CREATE TYPE "TransactionSource" AS ENUM ('TEXT', 'CSV', 'MANUAL');

CREATE TABLE "import_batch" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "totalRows" INTEGER NOT NULL,
  "importedRows" INTEGER NOT NULL,
  "skippedRows" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_batch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transaction" ADD COLUMN "importBatchId" TEXT;
ALTER TABLE "transaction" ADD COLUMN "source" "TransactionSource" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "transaction_userId_organizationId_importBatchId_idx" ON "transaction"("userId", "organizationId", "importBatchId");
CREATE INDEX "transaction_duplicateOfId_idx" ON "transaction"("duplicateOfId");
CREATE INDEX "import_batch_userId_organizationId_createdAt_idx" ON "import_batch"("userId", "organizationId", "createdAt");

DROP POLICY IF EXISTS transaction_org_isolation ON "transaction";
CREATE POLICY transaction_org_isolation ON "transaction"
  USING ("organizationId" = current_setting('app.current_organization_id', true) AND "userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true) AND "userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS category_rule_org_isolation ON "category_rule";
CREATE POLICY category_rule_org_isolation ON "category_rule"
  USING ("organizationId" = current_setting('app.current_organization_id', true) AND "userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true) AND "userId" = current_setting('app.current_user_id', true));

ALTER TABLE "import_batch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_batch" FORCE ROW LEVEL SECURITY;
CREATE POLICY import_batch_tenant_isolation ON "import_batch"
  USING ("organizationId" = current_setting('app.current_organization_id', true) AND "userId" = current_setting('app.current_user_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true) AND "userId" = current_setting('app.current_user_id', true));
