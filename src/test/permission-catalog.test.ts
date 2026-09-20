import { describe, expect, it } from 'vitest';
import { hasActionPermission } from '../lib/access-control';
import { getPermissionKeys, hasPermissionKey, parsePermissions } from '../lib/permission-catalog';

describe('catálogo de permissões granulares', () => {
  it('normaliza permissões novas e antigas', () => {
    expect(parsePermissions('Members:Update, MATERIALS')).toEqual(['members:update', 'materials']);
    expect(hasPermissionKey('materials', 'materials', 'delete')).toBe(true);
    expect(hasPermissionKey('members:update', 'members', 'update')).toBe(true);
  });

  it('expõe as ações válidas de um módulo', () => {
    expect(getPermissionKeys('members')).toContain('members:manage_access');
    expect(getPermissionKeys('bible')).toEqual(['bible:view']);
  });

  it('exige permissão explícita para gerenciamento de membros', () => {
    const pastor = { role: 'PASTOR', permissions: [], planFeatures: ['members'] };
    const leader = { role: 'LEADER', permissions: ['members:update'], planFeatures: ['members'] };

    expect(hasActionPermission(pastor, 'members', 'update')).toBe(false);
    expect(hasActionPermission(leader, 'members', 'update')).toBe(true);
  });
});
