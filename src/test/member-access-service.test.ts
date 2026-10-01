import { describe, expect, it, vi } from 'vitest';
import { hasActionPermission } from '@/lib/access-control';
import { MemberAccessService } from '@/server/members/member-access.service';
import type { MemberAccessRepository } from '@/server/members/member-access.repository';

function repositoryMock(existingRole: string, existingPermissions: string) {
  const member = { id: 'member-1', name: 'Membro', email: 'member@test.local' };
  const existingUser = {
    id: 'user-1',
    email: member.email,
    passwordHash: 'hash',
    role: existingRole,
    permissions: existingPermissions,
  };
  const saveUser = vi.fn().mockImplementation(async (data) => ({ id: data.id ?? 'user-1', email: data.email, role: data.role, permissions: data.permissions }));
  return { repository: { findMember: vi.fn().mockResolvedValue(member), findUser: vi.fn().mockResolvedValue(existingUser), saveUser } as unknown as MemberAccessRepository, saveUser };
}

describe('transições de perfil', () => {
  it('remove permissões administrativas ao rebaixar ADMIN para MEMBER', async () => {
    const { repository, saveUser } = repositoryMock('ADMIN', 'members:delete,canteen:sell,settings:update');
    const result = await new MemberAccessService(repository).update('member-1', { role: 'MEMBER', permissions: [], password: '' });

    expect(saveUser).toHaveBeenCalledWith(expect.objectContaining({ role: 'MEMBER', permissions: expect.stringContaining('bible:view') }));
    expect(result.permissions).not.toContain('members:delete');
    expect(result.permissions).not.toContain('settings:update');
    expect(hasActionPermission({ role: result.role, permissions: result.permissions, planFeatures: ['members'] }, 'members', 'delete')).toBe(false);
  });

  it('restaura acesso total ao promover MEMBER para ADMIN', async () => {
    const { repository } = repositoryMock('MEMBER', 'feed:view');
    const result = await new MemberAccessService(repository).update('member-1', { role: 'ADMIN', permissions: [], password: '' });

    expect(result.role).toBe('ADMIN');
    expect(hasActionPermission({ role: result.role, permissions: result.permissions, planFeatures: [] }, 'members', 'delete')).toBe(true);
    expect(hasActionPermission({ role: result.role, permissions: result.permissions, planFeatures: [] }, 'canteen', 'manage_products')).toBe(true);
  });
});
