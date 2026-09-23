import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureGroupTeamCompatibility, upsertCanonicalTeamGroup } from '@/lib/group-team-compat';
import { hasActionPermission } from '@/lib/access-control';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const sessionRole = session?.user?.role?.toUpperCase();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'groups', 'update') || !['ADMIN', 'PASTOR'].includes(sessionRole ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { leaderIds } = await request.json();
  const { id } = await params;
  const normalizedLeaderIds = Array.isArray(leaderIds)
    ? leaderIds.filter((leaderId): leaderId is string => typeof leaderId === 'string')
    : [];

  const prisma = getTenantClient(session.user.tenantId);
  await ensureGroupTeamCompatibility(prisma);

  const [group] = await prisma.$queryRawUnsafe<Array<{
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    icon: string | null;
  }>>(
    `SELECT id, name, description, color, icon FROM "Group" WHERE id = ? AND type = 'team' AND deletedAt IS NULL LIMIT 1`,
    id
  );

  if (!group) {
    return NextResponse.json({ error: 'Equipe não encontrada' }, { status: 404 });
  }

  const members = await prisma.$queryRawUnsafe<Array<{ memberId: string }>>(
    `SELECT memberId FROM "GroupMember" WHERE groupId = ? AND deletedAt IS NULL`,
    id
  );

  const memberIds = Array.from(new Set([...members.map((member) => member.memberId), ...normalizedLeaderIds]));

  await upsertCanonicalTeamGroup(prisma, {
    id,
    name: group.name,
    description: group.description,
    color: group.color ?? 'primary',
    icon: group.icon ?? 'users',
    memberIds,
    leaderIds: normalizedLeaderIds,
  });

  return NextResponse.json({ success: true, leaderIds: normalizedLeaderIds });
}
