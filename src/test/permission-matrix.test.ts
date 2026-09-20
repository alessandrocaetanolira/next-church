import { describe, expect, it } from 'vitest';
import { hasActionPermission, hasPlanFeature } from '@/lib/access-control';

describe('matriz de acesso por perfil', () => {
  const allFeatures = ['members', 'groups', 'tasks', 'materials', 'canteen', 'pastoral', 'feed', 'bible', 'games', 'notifications', 'settings'];

  it('admin granular possui operações administrativas atribuídas', () => {
    const user = { role: 'ADMIN', permissions: ['members:create', 'members:delete', 'groups:update'], planFeatures: allFeatures };
    expect(hasActionPermission(user, 'members', 'create')).toBe(true);
    expect(hasActionPermission(user, 'members', 'delete')).toBe(true);
    expect(hasActionPermission(user, 'groups', 'update')).toBe(true);
  });

  it('pastor possui visualização e gestão de acesso, mas não CRUD não atribuído', () => {
    const user = { role: 'PASTOR', permissions: [], planFeatures: allFeatures };
    expect(hasActionPermission(user, 'members', 'view')).toBe(true);
    expect(hasActionPermission(user, 'members', 'manage_access')).toBe(true);
    expect(hasActionPermission(user, 'members', 'delete')).toBe(false);
  });

  it('líder recebe apenas as ações explicitamente atribuídas', () => {
    const user = { role: 'LEADER', permissions: ['groups:update', 'tasks:view'], planFeatures: allFeatures };
    expect(hasActionPermission(user, 'groups', 'update')).toBe(true);
    expect(hasActionPermission(user, 'groups', 'delete')).toBe(false);
    expect(hasActionPermission(user, 'tasks', 'view')).toBe(true);
    expect(hasActionPermission(user, 'tasks', 'create')).toBe(false);
  });

  it('membro pode solicitar ingresso quando recebe essa permissão', () => {
    const user = { role: 'MEMBER', permissions: ['groups:view', 'groups:request'], planFeatures: allFeatures };
    expect(hasActionPermission(user, 'groups', 'view')).toBe(true);
    expect(hasActionPermission(user, 'groups', 'request')).toBe(true);
    expect(hasActionPermission(user, 'groups', 'update')).toBe(false);
  });

  it('plano sem recurso bloqueia a ação mesmo com permissão de usuário', () => {
    const user = { role: 'ADMIN', permissions: ['canteen:create'], planFeatures: ['members', 'groups'] };
    expect(hasPlanFeature(user, 'canteen')).toBe(false);
    expect(hasActionPermission(user, 'canteen', 'create')).toBe(false);
  });
});
