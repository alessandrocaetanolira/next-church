import { describe, expect, it } from 'vitest';
import { belongsToTenant, filterByTenant } from '@/lib/offline-tenant';

describe('isolamento de registros offline por tenant', () => {
  const records = [
    { id: 'task-a', tenantId: 'tenant-a' },
    { id: 'task-b', tenantId: 'tenant-b' },
    { id: 'legacy' },
  ];

  it('retorna somente registros do tenant solicitado', () => {
    expect(filterByTenant(records, 'tenant-a')).toEqual([{ id: 'task-a', tenantId: 'tenant-a' }]);
    expect(filterByTenant(records, 'tenant-b')).toEqual([{ id: 'task-b', tenantId: 'tenant-b' }]);
    expect(filterByTenant(records, '')).toEqual([]);
  });

  it('não considera registro legado como pertencente ao tenant', () => {
    expect(belongsToTenant(records[0], 'tenant-a')).toBe(true);
    expect(belongsToTenant(records[0], 'tenant-b')).toBe(false);
    expect(belongsToTenant(records[2], 'tenant-a')).toBe(false);
  });
});
