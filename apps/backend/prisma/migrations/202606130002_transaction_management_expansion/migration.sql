CREATE TYPE "TransactionStatus" AS ENUM ('SAVED', 'NEEDS_REVIEW');

ALTER TABLE "transaction"
ADD COLUMN "status" "TransactionStatus" NOT NULL DEFAULT 'SAVED',
ADD COLUMN "accountLabel" TEXT NOT NULL DEFAULT 'Personal',
ADD COLUMN "duplicateOfId" TEXT;

CREATE TABLE "category_rule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "matchText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_rule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "category_rule_organizationId_matchText_key" ON "category_rule"("organizationId", "matchText");
CREATE INDEX "category_rule_userId_idx" ON "category_rule"("userId");
CREATE INDEX "category_rule_organizationId_idx" ON "category_rule"("organizationId");
CREATE INDEX "transaction_organizationId_status_idx" ON "transaction"("organizationId", "status");
CREATE INDEX "transaction_organizationId_category_idx" ON "transaction"("organizationId", "category");
CREATE INDEX "transaction_organizationId_accountLabel_idx" ON "transaction"("organizationId", "accountLabel");
CREATE INDEX "transaction_userId_organizationId_createdAt_id_idx" ON "transaction"("userId", "organizationId", "createdAt", "id");
CREATE INDEX "transaction_organizationId_createdAt_id_idx" ON "transaction"("organizationId", "createdAt", "id");
CREATE INDEX "category_rule_userId_organizationId_createdAt_id_idx" ON "category_rule"("userId", "organizationId", "createdAt", "id");

ALTER TABLE "category_rule" ADD CONSTRAINT "category_rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_rule" ADD CONSTRAINT "category_rule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaction" FORCE ROW LEVEL SECURITY;
ALTER TABLE "category_rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "category_rule" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transaction_org_isolation ON "transaction";
CREATE POLICY transaction_org_isolation ON "transaction"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

DROP POLICY IF EXISTS category_rule_org_isolation ON "category_rule";
CREATE POLICY category_rule_org_isolation ON "category_rule"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
