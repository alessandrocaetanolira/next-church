import { normalizePlanFeatures, PLAN_FEATURE_BY_PERMISSION, type PlanFeature } from './plan-features';
import { hasPermissionKey, parsePermissions, type PermissionAction, type PermissionModule } from './permission-catalog';

type AppUser = {
  email?: string | null;
  role?: string | null;
  permissions?: string[] | string | null;
  teamIds?: string[] | string | null;
  isPlatformAdmin?: boolean;
  planFeatures?: string[] | string | null;
};

function normalizePermissions(permissions: AppUser['permissions']) {
  return parsePermissions(permissions);
}

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

  if (role === 'PASTOR' && ['tasks', 'teams', 'materials', 'pastor', 'settings'].includes(permission)) {
    return true;
  }

  const permissions = normalizePermissions(user.permissions);
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

  if (hasPermissionKey(user.permissions, module, action)) return true;

  const role = user.role?.toUpperCase();
  if (role === 'ADMIN' || role === 'PASTOR') {
    return action === 'view' || action === 'manage_access';
  }

  return false;
}

export function hasAnyActionPermission(
  user: AppUser | null | undefined,
  module: PermissionModule,
  actions: PermissionAction[],
) {
  return actions.some((action) => hasActionPermission(user, module, action));
}

export function canAccessCanteen(user: AppUser | null | undefined) {
  return hasAnyActionPermission(user, 'canteen', ['view', 'catalog', 'operate', 'sell', 'manage', 'manage_products']);
}

export function hasPlanFeature(user: AppUser | null | undefined, feature?: PlanFeature) {
  if (!user || !feature) return true;
  if (user.isPlatformAdmin) return true;
  if (user.planFeatures === undefined || user.planFeatures === null) return true;
  return normalizePlanFeatures(user.planFeatures).includes(feature);
}

export function hasTeamScopedAccess(user: AppUser | null | undefined, permission: 'tasks' | 'materials') {
  if (hasPermission(user, permission)) return true;
  return normalizeTeamIds(user?.teamIds).length > 0;
}

export function canAccessRoute(user: AppUser | null | undefined, pathname: string) {
  if (!user) return false;

  if (
    (pathname === '/' && hasPlanFeature(user, 'dashboard')) ||
    (pathname.startsWith('/carteira') && hasPlanFeature(user, 'members')) ||
    pathname.startsWith('/minha-conta') ||
    (pathname.startsWith('/notifications') && hasPlanFeature(user, 'notifications')) ||
    (pathname.startsWith('/feed') && hasPlanFeature(user, 'feed')) ||
    (pathname.startsWith('/groups') && hasPlanFeature(user, 'groups')) ||
    (pathname.startsWith('/social-projects') && hasPlanFeature(user, 'social_projects')) ||
    (pathname.startsWith('/kids') && hasPlanFeature(user, 'kids')) ||
    (pathname.startsWith('/parking') && hasPlanFeature(user, 'parking')) ||
    (pathname.startsWith('/bible') && hasPlanFeature(user, 'bible')) ||
    (pathname.startsWith('/games') && hasPlanFeature(user, 'games')) ||
    (pathname.startsWith('/jogos-novos') && hasPlanFeature(user, 'games')) ||
    (pathname.startsWith('/quiz') && hasPlanFeature(user, 'games')) ||
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
