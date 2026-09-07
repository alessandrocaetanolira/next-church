type AppUser = {
  email?: string | null;
  role?: string | null;
  permissions?: string[] | string | null;
  teamIds?: string[] | string | null;
};

function normalizePermissions(permissions: AppUser['permissions']) {
  if (Array.isArray(permissions)) {
    return permissions.map((permission) => permission.toLowerCase());
  }

  if (typeof permissions === 'string') {
    return permissions
      .split(',')
      .map((permission) => permission.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
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

  const role = user.role?.toUpperCase();
  if (role === 'ADMIN') return true;

  if (role === 'PASTOR' && ['tasks', 'teams', 'materials', 'pastor', 'settings'].includes(permission)) {
    return true;
  }

  return normalizePermissions(user.permissions).includes(permission.toLowerCase());
}

export function hasTeamScopedAccess(user: AppUser | null | undefined, permission: 'tasks' | 'materials') {
  if (hasPermission(user, permission)) return true;
  return normalizeTeamIds(user?.teamIds).length > 0;
}

export function canAccessRoute(user: AppUser | null | undefined, pathname: string) {
  if (!user) return false;

  if (
    pathname === '/' ||
    pathname.startsWith('/carteira') ||
    pathname.startsWith('/minha-conta') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/feed') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/social-projects') ||
    pathname.startsWith('/kids') ||
    pathname.startsWith('/parking') ||
    pathname.startsWith('/bible') ||
    pathname.startsWith('/games') ||
    pathname.startsWith('/jogos-novos') ||
    pathname.startsWith('/quiz') ||
    pathname.startsWith('/equipes') ||
    pathname.startsWith('/teams')
  ) {
    return true;
  }

  if (pathname.startsWith('/cantina')) {
    return hasPermission(user, 'canteen');
  }

  if (pathname.startsWith('/settings')) {
    return hasPermission(user, 'settings');
  }

  if (pathname.startsWith('/pastoral')) {
    return hasPermission(user, 'pastor');
  }

  if (pathname.startsWith('/members')) {
    const role = user.role?.toUpperCase();
    return role === 'ADMIN' || role === 'PASTOR';
  }

  if (pathname.startsWith('/schedules')) {
    return hasTeamScopedAccess(user, 'tasks');
  }

  if (pathname.startsWith('/materials')) {
    return hasTeamScopedAccess(user, 'materials');
  }

  if (pathname.startsWith('/admin')) {
    return user.email === 'admin@teste.com';
  }

  return false;
}
