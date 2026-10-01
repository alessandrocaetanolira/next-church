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
    expect(getAccessibleModules(orderOnlyMember).has('canteen')).toBe(true);
  });

  it('exibe a cantina para membros com visualização ou catálogo', () => {
    const viewOnlyMember = { role: 'MEMBER', permissions: ['canteen:view'], planFeatures: ['canteen'] };
    const catalogMember = { role: 'MEMBER', permissions: ['canteen:catalog'], planFeatures: ['canteen'] };

    expect(getAccessibleModules(viewOnlyMember).has('canteen')).toBe(true);
    expect(getAccessibleModules(catalogMember).has('canteen')).toBe(true);
  });

  it('expõe tarefas e materiais para o líder somente quando há equipes vinculadas', () => {
    const leader = { role: 'LEADER', permissions: ['tasks:view', 'materials:view'], planFeatures: ['tasks', 'materials'], teamIds: ['team-1'] };
    const leaderWithoutTeams = { ...leader, teamIds: [] };

    expect(canAccessRoute(leader, '/schedules')).toBe(true);
    expect(canAccessRoute(leader, '/materials')).toBe(true);
    expect(canAccessRoute(leaderWithoutTeams, '/schedules')).toBe(false);
    expect(canAccessRoute(leaderWithoutTeams, '/materials')).toBe(false);
  });

  it('não exibe módulos sem permissão de visualização para membro', () => {
    const member = {
      role: 'MEMBER',
      permissions: ['feed:view', 'bible:view'],
      planFeatures: ['feed', 'bible', 'kids', 'social_projects', 'parking', 'materials'],
    };

    expect(canAccessRoute(member, '/kids')).toBe(false);
    expect(canAccessRoute(member, '/social-projects')).toBe(false);
    expect(canAccessRoute(member, '/parking')).toBe(false);
    expect(canAccessRoute(member, '/materials')).toBe(false);
    expect(getAccessibleModules(member).has('kids')).toBe(false);
  });
});
