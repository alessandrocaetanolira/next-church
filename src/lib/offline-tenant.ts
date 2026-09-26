export type TenantScopedRecord = { tenantId?: string };

/** Registros sem tenant nunca são considerados seguros para uma sessão ativa. */
export function filterByTenant<T extends TenantScopedRecord>(records: T[], tenantId: string) {
  if (!tenantId) return [];
  return records.filter((record) => record.tenantId === tenantId);
}

export function belongsToTenant(record: TenantScopedRecord | undefined, tenantId: string) {
  return Boolean(tenantId) && record?.tenantId === tenantId;
}
