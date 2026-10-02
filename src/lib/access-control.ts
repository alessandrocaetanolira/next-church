import { normalizePlanFeatures, PLAN_FEATURE_BY_PERMISSION, type PlanFeature } from './plan-features';
import { getEffectivePermissions, hasPermissionKey, parsePermissions, type PermissionAction, type PermissionModule } from './permission-catalog';

type AppUser = {
  email?: string | null;
  tenantId?: string | null;
  role?: string | null;
  permissions?: string[] | string | null;
  linkedMemberId?: string | null;
  teamIds?: string[] | string | null;
  isPlatformAdmin?: boolean;
  planFeatures?: string[] | string | null;
};

export const APP_MODULE_PATHS = {
  dashboard: '/',
  wallet: '/carteira',
  schedules: '/schedules',
  groups: '/groups',
  kids: '/kids',
  socialProjects: '/social-projects',
  parking: '/parking',
  members: '/members',
  materials: '/materials',
  games: '/jogos-novos',
  bible: '/bible',
  feed: '/feed',
  notifications: '/notifications',
  canteen: '/cantina',
  pastoral: '/pastoral',
  settings: '/settings',
} as const;

export type AppModule = keyof typeof APP_MODULE_PATHS;

const MODULE_PLAN_FEATURES: Partial<Record<AppModule, PlanFeature>> = {
  members: 'members', groups: 'groups', schedules: 'tasks', materials: 'materials',
  canteen: 'canteen', pastoral: 'pastoral', kids: 'kids', parking: 'parking',
  socialProjects: 'social_projects', feed: 'feed', bible: 'bible', games: 'games',
  notifications: 'notifications', settings: 'settings',
};

function normalizeTeamIds(teamIds: AppUser['teamIds']) {
  if (Array.isArray(teamIds)) {
    return teamIds.filter(Boolean);
  }

  if (typeof teamIds === 'string') {
    return teamIds
      .split(',')
      .map((teamId) => teamId.trim())
      .filter(Boolean);
  }

  return [];
}

export function hasPermission(user: AppUser | null | undefined, permission: string) {
  if (!user) return false;
  if (!hasPlanFeature(user, PLAN_FEATURE_BY_PERMISSION[permission])) return false;

  const role = user.role?.toUpperCase();
  if (role === 'ADMIN') return true;

  const permissions = getEffectivePermissions(role, user.permissions);
  return permissions.includes(permission.toLowerCase()) || permissions.some((item) => item.startsWith(`${permission.toLowerCase()}:`));
}

/** Permissão granular para uso nas APIs e ações específicas de cada módulo. */
export function hasActionPermission(
  user: AppUser | null | undefined,
  module: PermissionModule,
  action: PermissionAction,
) {
  if (!user || !hasPlanFeature(user, PLAN_FEATURE_BY_PERMISSION[module])) return false;
  if (user.isPlatformAdmin) return true;

  const role = user.role?.toUpperCase();
  if (role === 'ADMIN') return true;
  return hasPermissionKey(getEffectivePermissions(role, user.permissions), module, action);
}

export function hasAnyActionPermission(
  user: AppUser | null | undefined,
  module: PermissionModule,
  actions: PermissionAction[],
) {
  return actions.some((action) => hasActionPermission(user, module, action));
}

/** Presença é uma capacidade administrativa explícita, separada de members:view. */
export function canViewMemberPresence(user: AppUser | null | undefined) {
  if (!user || user.isPlatformAdmin || !user.tenantId || !hasPlanFeature(user, 'members')) return false;
  if (user.role?.toUpperCase() === 'ADMIN') return true;
  return parsePermissions(user.permissions).includes('members:online:view');
}

export function canAccessCanteen(user: AppUser | null | undefined) {
  return hasAnyActionPermission(user, 'canteen', ['view', 'catalog', 'order', 'operate', 'sell', 'manage', 'manage_products']);
}

export function hasPlanFeature(user: AppUser | null | undefined, feature?: PlanFeature) {
  if (!user || !feature) return true;
  if (user.isPlatformAdmin) return true;
  if (user.role?.toUpperCase() === 'ADMIN') return true;
  if (feature === 'settings' && user.role?.toUpperCase() === 'PASTOR') return true;
  if (user.planFeatures === undefined || user.planFeatures === null) return true;
  return normalizePlanFeatures(user.planFeatures).includes(feature);
}

export function isModulePlanAvailable(user: AppUser | null | undefined, module: AppModule) {
  return hasPlanFeature(user, MODULE_PLAN_FEATURES[module]);
}

/** Permite exibir um módulo bloqueado pelo plano para informar o motivo ao usuário. */
export function canSeeModuleEntry(user: AppUser | null | undefined, module: AppModule) {
  if (!user) return false;
  if (isModulePlanAvailable(user, module)) return canAccessRoute(user, APP_MODULE_PATHS[module]);
  if (module === 'canteen') return hasPermissionKey(getEffectivePermissions(user.role, user.permissions), 'canteen', 'order');
  return false;
}

export function hasTeamScopedAccess(user: AppUser | null | undefined, permission: 'tasks' | 'materials') {
  if (!user || !hasPermission(user, permission)) return false;
  const role = user.role?.toUpperCase();
  if (role === 'ADMIN' || role === 'PASTOR') return true;
  if (role === 'LEADER') return normalizeTeamIds(user.teamIds).length > 0;
  return true;
}

export function canAccessRoute(user: AppUser | null | undefined, pathname: string) {
  if (!user) return false;

  if (
    (pathname === '/' && hasPlanFeature(user, 'dashboard')) ||
    (pathname.startsWith('/carteira') && hasPlanFeature(user, 'members')) ||
    pathname.startsWith('/minha-conta') ||
    (pathname.startsWith('/perfil') && Boolean(user.tenantId)) ||
    (pathname.startsWith('/notifications') && hasActionPermission(user, 'notifications', 'view')) ||
    (pathname.startsWith('/feed') && hasActionPermission(user, 'feed', 'view')) ||
    (pathname.startsWith('/groups') && hasAnyActionPermission(user, 'groups', ['view', 'request'])) ||
    (pathname.startsWith('/social-projects') && hasActionPermission(user, 'social_projects', 'view')) ||
    (pathname.startsWith('/kids') && hasActionPermission(user, 'kids', 'view')) ||
    (pathname.startsWith('/parking') && hasActionPermission(user, 'parking', 'view')) ||
    (pathname.startsWith('/bible') && hasActionPermission(user, 'bible', 'view')) ||
    (pathname.startsWith('/games') && hasActionPermission(user, 'games', 'view')) ||
    (pathname.startsWith('/jogos-novos') && hasActionPermission(user, 'games', 'view')) ||
    (pathname.startsWith('/quiz') && hasActionPermission(user, 'games', 'view')) ||
    (pathname.startsWith('/equipes') && hasPlanFeature(user, 'groups')) ||
    (pathname.startsWith('/teams') && hasPlanFeature(user, 'groups'))
  ) {
    return true;
  }

  if (pathname.startsWith('/cantina')) {
    return canAccessCanteen(user);
  }

  if (pathname.startsWith('/settings')) {
    return hasPermission(user, 'settings');
  }

  if (pathname.startsWith('/pastoral')) {
    return hasPermission(user, 'pastor');
  }

  if (pathname.startsWith('/members')) {
    const role = user.role?.toUpperCase();
    return hasPlanFeature(user, 'members') && (role === 'ADMIN' || role === 'PASTOR');
  }

  if (pathname.startsWith('/schedules')) {
    return hasTeamScopedAccess(user, 'tasks');
  }

  if (pathname.startsWith('/materials')) {
    return hasTeamScopedAccess(user, 'materials');
  }

  if (pathname.startsWith('/admin')) {
    return user.isPlatformAdmin === true;
  }

  return false;
}

/** Retorna os módulos disponíveis para a sessão atual, para uso na navegação. */
export function getAccessibleModules(user: AppUser | null | undefined) {
  if (!user || user.isPlatformAdmin) return new Set<AppModule>();

  return new Set<AppModule>(
    (Object.entries(APP_MODULE_PATHS) as [AppModule, string][])
      .filter(([, pathname]) => canAccessRoute(user, pathname))
      .map(([module]) => module),
  );
}
