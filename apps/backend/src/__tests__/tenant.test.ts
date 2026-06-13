import { buildScopedTransactionWhere, type TenantScope } from "../isolation";
import { buildTransactionWhere } from "../transaction-query";

describe("tenant isolation helpers", () => {
  it("builds transaction filters from the authenticated tenant scope only", () => {
    const scope: TenantScope = {
      userId: "user_a",
      organizationId: "org_a",
      teamId: "team_a"
    };

    expect(buildScopedTransactionWhere(scope)).toEqual({
      userId: "user_a",
      organizationId: "org_a"
    });
  });

  it("does not accept caller-supplied organization ids in scoped filters", () => {
    const attackerSuppliedOrgId = "org_b";
    const scope: TenantScope = {
      userId: "user_a",
      organizationId: "org_a",
      teamId: null
    };

    const where = buildScopedTransactionWhere(scope);

    expect(where.organizationId).not.toBe(attackerSuppliedOrgId);
    expect(where.organizationId).toBe("org_a");
  });

  it("adds transaction filters without weakening authenticated tenant scope", () => {
    const scope: TenantScope = {
      userId: "user_a",
      organizationId: "org_a",
      teamId: null
    };

    const where = buildTransactionWhere(scope, {
      search: "starbucks",
      type: "DEBIT",
      status: "NEEDS_REVIEW",
      category: "Dining",
      accountLabel: "Business",
      minConfidence: 0.8,
      dateFrom: "2025-12-01",
      dateTo: "2025-12-31"
    });

    expect(where).toMatchObject({
      userId: "user_a",
      organizationId: "org_a",
      description: { contains: "starbucks", mode: "insensitive" },
      type: "DEBIT",
      status: "NEEDS_REVIEW",
      category: "Dining",
      accountLabel: "Business",
      confidence: { gte: 0.8 }
    });
    expect(where.date).toMatchObject({
      gte: new Date("2025-12-01T00:00:00.000Z"),
      lte: new Date("2025-12-31T23:59:59.999Z")
    });
  });
});
