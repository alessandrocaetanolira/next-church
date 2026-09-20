import { describe, expect, it } from 'vitest';
import { canAccessCanteen, canAccessRoute, hasPermission, hasPlanFeature } from '../lib/access-control';

describe('permissões combinadas com recursos do plano', () => {
  const admin = {
    email: 'admin@igreja.test',
    role: 'ADMIN',
    permissions: [],
    planFeatures: ['dashboard', 'members', 'groups'],
  };

  it('não libera permissão administrativa quando o plano não possui o recurso', () => {
    expect(hasPermission(admin, 'canteen')).toBe(false);
    expect(hasPlanFeature(admin, 'canteen')).toBe(false);
  });

  it('exige recurso do plano para acessar a rota correspondente', () => {
    expect(canAccessRoute(admin, '/members')).toBe(true);
    expect(canAccessRoute(admin, '/cantina')).toBe(false);
    expect(canAccessRoute(admin, '/games')).toBe(false);
  });

  it('mantém compatibilidade para sessões antigas sem entitlements', () => {
    const legacyAdmin = { ...admin, planFeatures: undefined };
    expect(hasPermission(legacyAdmin, 'canteen')).toBe(true);
    expect(canAccessRoute(legacyAdmin, '/cantina')).toBe(true);
  });

  it('não permite acessar a cantina apenas com permissão de pedido', () => {
    const orderOnlyMember = {
      role: 'MEMBER',
      permissions: ['canteen:order'],
      planFeatures: ['canteen'],
    };

    expect(canAccessCanteen(orderOnlyMember)).toBe(false);
    expect(canAccessRoute(orderOnlyMember, '/cantina')).toBe(false);
  });
});
