import { describe, expect, it } from 'vitest';
import { hasActionPermission, hasPlanFeature } from '@/lib/access-control';
import { getRoleDefaultPermissions } from '@/lib/permission-catalog';

describe('matriz de acesso por perfil', () => {
  const allFeatures = ['members', 'groups', 'tasks', 'materials', 'canteen', 'pastoral', 'feed', 'bible', 'games', 'notifications', 'settings'];

  it('admin granular possui operações administrativas atribuídas', () => {
    const user = { role: 'ADMIN', permissions: ['members:create', 'members:delete', 'groups:update'], planFeatures: allFeatures };
    expect(hasActionPermission(user, 'members', 'create')).toBe(true);
    expect(hasActionPermission(user, 'members', 'delete')).toBe(true);
    expect(hasActionPermission(user, 'groups', 'update')).toBe(true);
  });

  it('admin do tenant possui todas as ações mesmo sem permissões granulares', () => {
    const user = { role: 'ADMIN', permissions: [], planFeatures: ['dashboard'] };
    expect(hasActionPermission(user, 'canteen', 'manage_products')).toBe(true);
    expect(hasActionPermission(user, 'members', 'delete')).toBe(true);
    expect(hasActionPermission(user, 'groups', 'update')).toBe(true);
  });

  it('pastor possui visualização e gestão de acesso, mas não CRUD não atribuído', () => {
    const user = { role: 'PASTOR', permissions: [], planFeatures: allFeatures };
    expect(hasActionPermission(user, 'members', 'view')).toBe(true);
    expect(hasActionPermission(user, 'members', 'manage_access')).toBe(true);
    expect(hasActionPermission(user, 'members', 'delete')).toBe(false);
  });

  it('líder herda o membro e recebe ações padrão de liderança', () => {
    const user = { role: 'LEADER', permissions: getRoleDefaultPermissions('LEADER'), planFeatures: allFeatures };
    expect(hasActionPermission(user, 'groups', 'update')).toBe(true);
    expect(hasActionPermission(user, 'groups', 'delete')).toBe(false);
    expect(hasActionPermission(user, 'tasks', 'view')).toBe(true);
    expect(hasActionPermission(user, 'tasks', 'create')).toBe(true);
    expect(hasActionPermission(user, 'canteen', 'order')).toBe(true);
    expect(hasActionPermission(user, 'canteen', 'operate')).toBe(false);
  });

  it('CANTEEN herda o membro e recebe toda a operação da cantina', () => {
    const user = { role: 'CANTEEN', permissions: getRoleDefaultPermissions('CANTEEN'), planFeatures: allFeatures };
    expect(hasActionPermission(user, 'bible', 'view')).toBe(true);
    expect(hasActionPermission(user, 'canteen', 'sell')).toBe(true);
    expect(hasActionPermission(user, 'canteen', 'manage_products')).toBe(true);
    expect(hasActionPermission(user, 'groups', 'update')).toBe(false);
  });

  it('membro pode solicitar ingresso quando recebe essa permissão', () => {
    const user = { role: 'MEMBER', permissions: ['groups:view', 'groups:request'], planFeatures: allFeatures };
    expect(hasActionPermission(user, 'groups', 'view')).toBe(true);
    expect(hasActionPermission(user, 'groups', 'request')).toBe(true);
    expect(hasActionPermission(user, 'groups', 'update')).toBe(false);
  });

  it('plano sem recurso continua bloqueando perfis não administrativos', () => {
    const user = { role: 'ADMIN', permissions: ['canteen:create'], planFeatures: ['members', 'groups'] };
    expect(hasPlanFeature(user, 'canteen')).toBe(true);
    expect(hasActionPermission(user, 'canteen', 'create')).toBe(true);

    const member = { role: 'MEMBER', permissions: ['canteen:create'], planFeatures: ['members', 'groups'] };
    expect(hasPlanFeature(member, 'canteen')).toBe(false);
    expect(hasActionPermission(member, 'canteen', 'create')).toBe(false);
  });
});
