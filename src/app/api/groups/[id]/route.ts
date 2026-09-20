import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { canManageGroup, normalizeStringArray, parseJsonField } from '@/lib/groups';
import { generateId } from '@/lib/id';
import { ensureGroupTeamCompatibility, softDeleteCanonicalTeamGroup, upsertCanonicalTeamGroup } from '@/lib/group-team-compat';
import { hasActionPermission } from '@/lib/access-control';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId || !hasActionPermission(session.user, 'groups', 'view')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);

  const [group] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, name, description, type, capabilities, color, icon, active, createdAt, updatedAt
      FROM "Group"
      WHERE id = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    id
  );

  if (!group) {
    return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
  }

  const members = await prisma.$queryRawUnsafe<Array<{
    id: string;
    memberId: string;
    role: string;
    memberName: string | null;
    memberEmail: string | null;
  }>>(
    `
      SELECT gm.id, gm.memberId, gm.role, m.name as memberName, m.email as memberEmail
      FROM "GroupMember" gm
      LEFT JOIN "Member" m ON m.id = gm.memberId AND m.deletedAt IS NULL
      WHERE gm.groupId = ? AND gm.deletedAt IS NULL
      ORDER BY gm.role ASC, m.name ASC
    `,
    id
  );

  return NextResponse.json({
    ...group,
    capabilities: parseJsonField<string[]>(typeof group.capabilities === 'string' ? group.capabilities : null, []),
    members,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);

  const allowed = hasActionPermission(session.user, 'groups', 'update') && await canManageGroup(prisma, session.user.role, session.user.linkedMemberId, id);
  if (!allowed) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const now = new Date().toISOString();
  const name = String(body.name ?? '').trim();
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const type = typeof body.type === 'string' ? body.type.trim() : 'team';
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

    return NextResponse.json({ success: true });
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Group"
      SET name = ?, description = ?, type = ?, capabilities = ?, color = ?, icon = ?, updatedAt = ?
      WHERE id = ? AND deletedAt IS NULL
    `,
    name,
    description || null,
    type,
    JSON.stringify(capabilities),
    color,
    icon,
    now,
    id
  );

  await prisma.$executeRawUnsafe(
    `UPDATE "GroupMember" SET deletedAt = ?, updatedAt = ? WHERE groupId = ? AND deletedAt IS NULL`,
    now,
    now,
    id
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

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);

  const allowed = hasActionPermission(session.user, 'groups', 'delete') && await canManageGroup(prisma, session.user.role, session.user.linkedMemberId, id);
  if (!allowed) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const now = new Date().toISOString();

  const [group] = await prisma.$queryRawUnsafe<Array<{ type: string | null }>>(
    `SELECT type FROM "Group" WHERE id = ? AND deletedAt IS NULL LIMIT 1`,
    id
  );

  if (group?.type === 'team') {
    await softDeleteCanonicalTeamGroup(prisma, id);
    return NextResponse.json({ success: true });
  }

  await prisma.$executeRawUnsafe(`UPDATE "Group" SET deletedAt = ?, updatedAt = ? WHERE id = ?`, now, now, id);
  await prisma.$executeRawUnsafe(`UPDATE "GroupMember" SET deletedAt = ?, updatedAt = ? WHERE groupId = ? AND deletedAt IS NULL`, now, now, id);

  return NextResponse.json({ success: true });
}
