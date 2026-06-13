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
