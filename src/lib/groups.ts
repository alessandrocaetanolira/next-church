import { PrismaClient } from '@prisma/client';

export type GroupType = 'ministry' | 'team' | 'social_project' | 'kids' | 'parking';
export type GroupCapability = 'fundraising' | 'enrollment' | 'communication' | 'scheduling' | 'checkin';
export type GroupMemberRole = 'leader' | 'member' | 'responsible';
export type FeedVisibility = 'public' | 'group' | 'individual';

export function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export async function getAccessibleGroupIds(prisma: PrismaClient, memberId?: string | null) {
  if (!memberId) return [];

  const memberships = await prisma.$queryRawUnsafe<Array<{ groupId: string }>>(
    `
      SELECT groupId
      FROM "GroupMember"
      WHERE memberId = ? AND deletedAt IS NULL
    `,
    memberId
  );

  return Array.from(new Set(memberships.map((membership) => membership.groupId)));
}

export async function getGroupById(prisma: PrismaClient, id: string) {
  const [group] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, name, description, type, capabilities, color, icon, active, createdAt, updatedAt
      FROM "Group"
      WHERE id = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    id
  );

  if (!group) return null;

  return {
    ...group,
    capabilities: parseJsonField<GroupCapability[]>(typeof group.capabilities === 'string' ? group.capabilities : null, []),
  };
}

export async function canManageGroup(prisma: PrismaClient, role: string | null | undefined, memberId: string | null | undefined, groupId: string) {
  const normalizedRole = role?.toUpperCase();
  if (normalizedRole === 'ADMIN' || normalizedRole === 'PASTOR') return true;
  if (!memberId) return false;

  const [membership] = await prisma.$queryRawUnsafe<Array<{ role: string }>>(
    `
      SELECT role
      FROM "GroupMember"
      WHERE groupId = ? AND memberId = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    groupId,
    memberId
  );

  return ['leader', 'responsible'].includes(membership?.role ?? '');
}
