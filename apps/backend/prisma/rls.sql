ALTER TABLE "transaction" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transaction_org_isolation ON "transaction";
CREATE POLICY transaction_org_isolation ON "transaction"
  USING ("organizationId" = current_setting('app.current_organization_id', true));
