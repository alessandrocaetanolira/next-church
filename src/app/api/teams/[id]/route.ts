import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { ensureGroupTeamCompatibility, parseLeaderIds, softDeleteCanonicalTeamGroup, upsertCanonicalTeamGroup } from '@/lib/group-team-compat';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = session?.user?.role?.toUpperCase();
  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR', 'LEADER'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const { name, description, color, icon, memberIds, leaderIds } = await request.json();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);

  const [team] = await prisma.$queryRawUnsafe<Array<{ leaderIds: string | null }>>(
    `SELECT leaderIds FROM "Team" WHERE id = ? AND deletedAt IS NULL LIMIT 1`,
    id
  );

  const currentLeaders = parseLeaderIds(team?.leaderIds);
  if (role === 'LEADER' && !currentLeaders.includes(session.user.linkedMemberId ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  await upsertCanonicalTeamGroup(prisma, {
    id,
    name,
    description,
    color,
    icon,
    memberIds: Array.isArray(memberIds) ? memberIds : [],
    leaderIds: Array.isArray(leaderIds) ? leaderIds : [],
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = session?.user?.role?.toUpperCase();
  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);

  await softDeleteCanonicalTeamGroup(prisma, id);

  return NextResponse.json({ success: true });
}
