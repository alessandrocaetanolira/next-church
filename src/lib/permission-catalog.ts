export const PERMISSION_ACTIONS = ['view', 'catalog', 'order', 'create', 'publish', 'share', 'comment', 'moderate', 'update', 'delete', 'approve', 'manage_access', 'manage', 'manage_products', 'operate', 'sell', 'export', 'request'] as const;
export type PermissionAction = typeof PERMISSION_ACTIONS[number];

export const PERMISSION_MODULES = [
  'members',
  'groups',
  'teams',
  'tasks',
  'materials',
  'canteen',
  'pastoral',
  'kids',
  'parking',
  'social_projects',
  'feed',
  'bible',
  'games',
  'notifications',
  'settings',
] as const;
export type PermissionModule = typeof PERMISSION_MODULES[number];

export type PermissionKey = `${PermissionModule}:${PermissionAction}`;

export const PERMISSION_CATALOG: Record<PermissionModule, readonly PermissionAction[]> = {
  members: ['view', 'create', 'update', 'delete', 'approve', 'manage_access', 'export'],
  groups: ['view', 'create', 'update', 'delete', 'manage_access', 'request'],
  teams: ['view', 'create', 'update', 'delete', 'manage_access'],
  tasks: ['view', 'create', 'update', 'delete', 'export'],
  materials: ['view', 'create', 'update', 'delete', 'manage', 'request', 'export'],
  canteen: ['view', 'catalog', 'order', 'create', 'update', 'delete', 'manage', 'operate', 'sell', 'manage_products', 'export'],
  pastoral: ['view', 'create', 'update', 'delete', 'export'],
  kids: ['view', 'create', 'update', 'delete'],
  parking: ['view', 'create', 'update', 'delete'],
  social_projects: ['view', 'create', 'update', 'delete'],
  feed: ['view', 'create', 'publish', 'share', 'comment', 'moderate', 'update', 'delete'],
  bible: ['view'],
  games: ['view'],
  notifications: ['view', 'update'],
  settings: ['view', 'update'],
};

export function normalizePermission(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function permissionKey(module: PermissionModule, action: PermissionAction): PermissionKey {
  return `${module}:${action}`;
}

export function parsePermissions(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.map(normalizePermission).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(normalizePermission).filter(Boolean);
  return [];
}

/**
 * Aceita o formato novo `module:action` e o formato legado `module`.
 * O formato legado continua funcionando durante a migração.
 */
export function hasPermissionKey(
  permissions: string[] | string | null | undefined,
  module: PermissionModule,
  action: PermissionAction,
) {
  const normalized = parsePermissions(permissions);
  return normalized.includes(module) || normalized.includes(permissionKey(module, action));
}

export function getPermissionKeys(module: PermissionModule) {
  return PERMISSION_CATALOG[module].map((action) => permissionKey(module, action));
}
