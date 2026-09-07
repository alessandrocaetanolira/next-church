import { describe, expect, it } from 'vitest';
import { resolveDatabaseKey, selectChurches } from '../../prisma/scripts/migrate-tenants';

const churches = [
  { slug: 'igreja-publica', databaseKey: 'tenant-a', status: 'ACTIVE', active: true },
  { slug: 'igreja-provisionando', databaseKey: 'tenant-b', status: 'PROVISIONING', active: false },
  { slug: 'igreja-arquivada', databaseKey: 'tenant-c', status: 'ARCHIVED', active: false },
  { slug: 'igreja-legada', databaseKey: null, status: null, active: true },
];

describe('tenant migration orchestration', () => {
  it('resolve o banco pelo databaseKey e usa o slug apenas como fallback legado', () => {
    expect(resolveDatabaseKey(churches[0])).toBe('tenant-a');
    expect(resolveDatabaseKey(churches[3])).toBe('igreja-legada');
  });

  it('seleciona tenants ativos, em provisionamento e com falha por padrao', () => {
    expect(selectChurches(churches).map((church) => church.slug)).toEqual([
      'igreja-publica',
      'igreja-provisionando',
      'igreja-legada',
    ]);
  });

  it('filtra por slug ou databaseKey e inclui arquivados apenas explicitamente', () => {
    expect(selectChurches(churches, { requestedTenants: new Set(['tenant-a']) }).map((church) => church.slug))
      .toEqual(['igreja-publica']);
    expect(selectChurches(churches, { includeArchived: true, requestedTenants: new Set(['tenant-c']) })
      .map((church) => church.slug)).toEqual(['igreja-arquivada']);
  });
});
