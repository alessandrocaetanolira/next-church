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
export const SPECIAL_PERMISSION_KEYS = ['members:online:view'] as const;

/** Acesso básico concedido a um membro após a aprovação do cadastro. */
export const DEFAULT_MEMBER_PERMISSIONS = [
  'feed:view',
  'bible:view',
  'games:view',
  'groups:view',
  'groups:request',
  'feed:share',
  'canteen:view',
  'canteen:catalog',
  'canteen:order',
  'notifications:view',
] as const;

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

function getPermissionKeysForModule(module: PermissionModule) {
  return PERMISSION_CATALOG[module].map((action) => `${module}:${action}`);
}

/** Permissões padrão por perfil. Permissões extras continuam persistidas no usuário. */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, readonly string[]> = {
  MEMBER: DEFAULT_MEMBER_PERMISSIONS,
  LEADER: [
    ...DEFAULT_MEMBER_PERMISSIONS,
    'groups:create', 'groups:update', 'groups:manage_access',
    'tasks:view', 'tasks:create', 'tasks:update',
    'materials:view', 'materials:create', 'materials:update',
  ],
  CANTEEN: [
    ...DEFAULT_MEMBER_PERMISSIONS,
    ...getPermissionKeysForModule('canteen'),
  ],
  PASTOR: [
    ...DEFAULT_MEMBER_PERMISSIONS,
    'members:view', 'members:create', 'members:approve', 'members:manage_access',
    'groups:view', 'groups:create', 'groups:update', 'groups:manage_access',
    'tasks:view', 'tasks:create', 'tasks:update', 'tasks:delete', 'tasks:export',
    'materials:view', 'materials:create', 'materials:update', 'materials:manage', 'materials:export',
    'pastoral:view', 'pastoral:create', 'pastoral:update', 'pastoral:delete', 'pastoral:export',
  ],
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
  return module === 'members'
    ? [...getPermissionKeysForModule(module), ...SPECIAL_PERMISSION_KEYS]
    : getPermissionKeysForModule(module);
}

export function getRoleDefaultPermissions(role: string | null | undefined) {
  const normalizedRole = String(role ?? '').toUpperCase();
  return [...(ROLE_DEFAULT_PERMISSIONS[normalizedRole] ?? [])];
}

export function getEffectivePermissions(role: string | null | undefined, permissions: string[] | string | null | undefined) {
  const normalizedRole = String(role ?? '').toUpperCase();
  const hasNoExplicitPermissions = permissions === null || permissions === undefined || (Array.isArray(permissions) && permissions.length === 0) || permissions === '';
  const preset = hasNoExplicitPermissions && normalizedRole !== 'MEMBER' ? getRoleDefaultPermissions(normalizedRole) : [];
  return Array.from(new Set([...preset, ...parsePermissions(permissions)]));
}
