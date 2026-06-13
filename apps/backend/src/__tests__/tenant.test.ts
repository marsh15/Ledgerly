import { buildScopedTransactionWhere, type TenantScope } from "../isolation";

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
});
