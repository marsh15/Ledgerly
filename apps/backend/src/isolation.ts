export type TenantScope = {
  userId: string;
  organizationId: string;
  teamId: string | null;
};

export function buildScopedTransactionWhere(scope: TenantScope) {
  return {
    userId: scope.userId,
    organizationId: scope.organizationId
  };
}
