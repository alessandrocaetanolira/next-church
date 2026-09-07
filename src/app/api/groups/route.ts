import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { generateId } from '@/lib/id';
import { GroupCapability, GroupType, normalizeStringArray, parseJsonField } from '@/lib/groups';
import { ensureGroupTeamCompatibility, upsertCanonicalTeamGroup } from '@/lib/group-team-compat';

function canManageGroups(role?: string | null) {
  return ['ADMIN', 'PASTOR', 'LEADER'].includes(role?.toUpperCase() ?? '');
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);

  const type = request.nextUrl.searchParams.get('type');

  const groups = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, name, description, type, capabilities, color, icon, active, createdAt, updatedAt
      FROM "Group"
      WHERE deletedAt IS NULL
        AND (? IS NULL OR type = ?)
      ORDER BY name ASC
    `,
    type,
    type
  );

  const memberships = await prisma.$queryRawUnsafe<Array<{
    groupId: string;
    memberId: string;
    role: string;
    memberName: string | null;
  }>>(
    `
      SELECT gm.groupId, gm.memberId, gm.role, m.name as memberName
      FROM "GroupMember" gm
      LEFT JOIN "Member" m ON m.id = gm.memberId AND m.deletedAt IS NULL
      WHERE gm.deletedAt IS NULL
    `
  );

  return NextResponse.json(
    groups.map((group) => ({
      ...group,
      capabilities: parseJsonField<GroupCapability[]>(typeof group.capabilities === 'string' ? group.capabilities : null, []),
      members: memberships
        .filter((membership) => membership.groupId === group.id)
        .map((membership) => ({
          memberId: membership.memberId,
          role: membership.role,
          memberName: membership.memberName,
        })),
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId || !canManageGroups(session.user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const body = await request.json();
  const id = generateId();
  const now = new Date().toISOString();
  const name = String(body.name ?? '').trim();
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const type = String(body.type ?? 'team').trim() as GroupType;
  const color = typeof body.color === 'string' ? body.color.trim() || 'primary' : 'primary';
  const icon = typeof body.icon === 'string' ? body.icon.trim() || 'users' : 'users';
  const capabilities = normalizeStringArray(body.capabilities);
  const members: Array<{ memberId?: unknown; role?: unknown }> = Array.isArray(body.members) ? body.members : [];

  if (!name) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }

  if (type === 'team') {
    const memberIds = members
      .map((member) => (typeof member?.memberId === 'string' ? member.memberId : ''))
      .filter(Boolean);
    const leaderIds = members
      .filter((member) => {
        const role = typeof member?.role === 'string' ? member.role : 'member';
        return ['leader', 'responsible'].includes(role);
      })
      .map((member) => String(member.memberId));

    await upsertCanonicalTeamGroup(prisma, {
      id,
      name,
      description,
      color,
      icon,
      memberIds,
      leaderIds,
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  }

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "Group" (id, name, description, type, capabilities, color, icon, active, createdAt, updatedAt, deletedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    name,
    description || null,
    type,
    JSON.stringify(capabilities),
    color,
    icon,
    1,
    now,
    now,
    null
  );

  for (const member of members) {
    const memberId = typeof member?.memberId === 'string' ? member.memberId : '';
    const role = typeof member?.role === 'string' ? member.role : 'member';
    if (!memberId) continue;

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "GroupMember" (id, groupId, memberId, role, createdAt, updatedAt, deletedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      generateId(),
      id,
      memberId,
      role,
      now,
      now,
      null
    );
  }

  return NextResponse.json({ success: true, id }, { status: 201 });
}
