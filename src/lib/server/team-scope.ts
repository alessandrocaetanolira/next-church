import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { hasPermission } from '@/lib/access-control';

type SessionLike = {
  user?: {
    tenantId?: string | null;
    linkedMemberId?: string | null;
    email?: string | null;
    role?: string | null;
    permissions?: string[] | string | null;
    teamIds?: string[] | string | null;
  } | null;
};

function normalizeTeamIds(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export async function getTeamScopedAccess(session: SessionLike, permission: 'tasks' | 'materials') {
  const tenantId = session.user?.tenantId;
  if (!tenantId) {
    return {
      allowed: false,
      hasGlobalAccess: false,
      accessibleTeamIds: [] as string[],
      prisma: null,
    };
  }

  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const hasGlobalAccess = hasPermission(session.user ?? null, permission);
  if (hasGlobalAccess) {
    const teams = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "Team" WHERE deletedAt IS NULL ORDER BY name ASC`
    );
    return {
      allowed: true,
      hasGlobalAccess: true,
      accessibleTeamIds: teams.map((team) => team.id),
      prisma,
    };
  }

  const tokenTeamIds = normalizeTeamIds(session.user?.teamIds);
  if (tokenTeamIds.length > 0) {
    return {
      allowed: true,
      hasGlobalAccess: false,
      accessibleTeamIds: tokenTeamIds,
      prisma,
    };
  }

  if (!session.user?.linkedMemberId && !session.user?.email) {
    return {
      allowed: false,
      hasGlobalAccess: false,
      accessibleTeamIds: [] as string[],
      prisma,
    };
  }

  const [member] = await prisma.$queryRawUnsafe<Array<{ teamIds: string | null }>>(
    `
      SELECT teamIds
      FROM "Member"
      WHERE deletedAt IS NULL
        AND (id = ? OR email = ?)
      LIMIT 1
    `,
    session.user?.linkedMemberId ?? '',
    session.user?.email ?? ''
  );

  const accessibleTeamIds = normalizeTeamIds(member?.teamIds);

  return {
    allowed: accessibleTeamIds.length > 0,
    hasGlobalAccess: false,
    accessibleTeamIds,
    prisma,
  };
}
