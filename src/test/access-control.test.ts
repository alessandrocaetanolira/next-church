import { describe, expect, it } from 'vitest';
import { canAccessCanteen, canAccessRoute, getAccessibleModules, hasPermission, hasPlanFeature } from '../lib/access-control';

describe('permissões combinadas com recursos do plano', () => {
  const admin = {
    email: 'admin@igreja.test',
    role: 'ADMIN',
    permissions: [],
    planFeatures: ['dashboard', 'members', 'groups'],
  };

  it('libera todos os módulos para o administrador do tenant', () => {
    expect(hasPermission(admin, 'canteen')).toBe(true);
    expect(hasPlanFeature(admin, 'canteen')).toBe(true);
  });

  it('permite ao administrador acessar todas as rotas do tenant', () => {
    expect(canAccessRoute(admin, '/members')).toBe(true);
    expect(canAccessRoute(admin, '/cantina')).toBe(true);
    expect(canAccessRoute(admin, '/games')).toBe(true);
    expect(canAccessRoute(admin, '/bible')).toBe(true);
  });

  it('centraliza os módulos disponíveis para a navegação', () => {
    const modules = getAccessibleModules(admin);
    expect(modules.has('canteen')).toBe(true);
    expect(modules.has('games')).toBe(true);
    expect(modules.has('pastoral')).toBe(true);
  });

  it('mantém compatibilidade para sessões antigas sem entitlements', () => {
    const legacyAdmin = { ...admin, planFeatures: undefined };
    expect(hasPermission(legacyAdmin, 'canteen')).toBe(true);
    expect(canAccessRoute(legacyAdmin, '/cantina')).toBe(true);
  });

  it('permite acessar a cantina apenas com permissão de pedido', () => {
    const orderOnlyMember = {
      role: 'MEMBER',
      permissions: ['canteen:order'],
      planFeatures: ['canteen'],
    };

    expect(canAccessCanteen(orderOnlyMember)).toBe(true);
    expect(canAccessRoute(orderOnlyMember, '/cantina')).toBe(true);
  });
});
