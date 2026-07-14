CREATE TABLE "audit_event" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "requestId" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_event_organizationId_createdAt_idx" ON "audit_event"("organizationId", "createdAt");
CREATE INDEX "audit_event_actorId_createdAt_idx" ON "audit_event"("actorId", "createdAt");
ALTER TABLE "audit_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_event" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_event_insert_tenant ON "audit_event" FOR INSERT WITH CHECK (
  "organizationId" = current_setting('app.current_organization_id', true)
  AND "actorId" = current_setting('app.current_user_id', true)
);
CREATE POLICY audit_event_select_tenant ON "audit_event" FOR SELECT USING (
  "organizationId" = current_setting('app.current_organization_id', true)
  AND "actorId" = current_setting('app.current_user_id', true)
);

CREATE FUNCTION reject_audit_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit events are append-only';
END;
$$;
CREATE TRIGGER audit_event_append_only BEFORE UPDATE OR DELETE ON "audit_event" FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();
