ALTER TABLE "transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transaction" FORCE ROW LEVEL SECURITY;
ALTER TABLE "category_rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "category_rule" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transaction_org_isolation ON "transaction";
CREATE POLICY transaction_org_isolation ON "transaction"
  USING (
    "organizationId" = current_setting('app.current_organization_id', true)
    AND "userId" = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    "organizationId" = current_setting('app.current_organization_id', true)
    AND "userId" = current_setting('app.current_user_id', true)
  );

DROP POLICY IF EXISTS category_rule_org_isolation ON "category_rule";
CREATE POLICY category_rule_org_isolation ON "category_rule"
  USING (
    "organizationId" = current_setting('app.current_organization_id', true)
    AND "userId" = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    "organizationId" = current_setting('app.current_organization_id', true)
    AND "userId" = current_setting('app.current_user_id', true)
  );

ALTER TABLE "import_batch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_batch" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS import_batch_tenant_isolation ON "import_batch";
CREATE POLICY import_batch_tenant_isolation ON "import_batch"
  USING (
    "organizationId" = current_setting('app.current_organization_id', true)
    AND "userId" = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    "organizationId" = current_setting('app.current_organization_id', true)
    AND "userId" = current_setting('app.current_user_id', true)
  );

ALTER TABLE "audit_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_event" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_event_insert_tenant ON "audit_event";
CREATE POLICY audit_event_insert_tenant ON "audit_event"
  FOR INSERT WITH CHECK (
    "organizationId" = current_setting('app.current_organization_id', true)
    AND "actorId" = current_setting('app.current_user_id', true)
  );
DROP POLICY IF EXISTS audit_event_select_tenant ON "audit_event";
CREATE POLICY audit_event_select_tenant ON "audit_event"
  FOR SELECT USING (
    "organizationId" = current_setting('app.current_organization_id', true)
    AND "actorId" = current_setting('app.current_user_id', true)
  );
