import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { notifyTeamJoinRequest } from '@/lib/server/notification-service';
import { generateId } from '@/lib/id';
import { ensureGroupTeamCompatibility } from '@/lib/group-team-compat';
import { hasActionPermission } from '@/lib/access-control';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'groups', 'view')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);
  const role = session.user.role?.toUpperCase();

  if (role === 'ADMIN' || role === 'PASTOR') {
    const requests = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `
        SELECT id, memberId, memberName, teamId, teamName, status, createdAt, updatedAt
        FROM "TeamJoinRequest"
        WHERE deletedAt IS NULL
        ORDER BY createdAt DESC
      `
    );

    return NextResponse.json(requests);
  }

  if (role === 'LEADER' && session.user.linkedMemberId) {
    const ledTeams = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        SELECT id
        FROM "Team"
        WHERE deletedAt IS NULL
          AND (',' || COALESCE(leaderIds, '') || ',') LIKE ?
      `,
      `%,${session.user.linkedMemberId},%`
    );

    if (!ledTeams.length) {
      return NextResponse.json([]);
    }

    const placeholders = ledTeams.map(() => '?').join(', ');
    const requests = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `
        SELECT id, memberId, memberName, teamId, teamName, status, createdAt, updatedAt
        FROM "TeamJoinRequest"
        WHERE deletedAt IS NULL
          AND teamId IN (${placeholders})
        ORDER BY createdAt DESC
      `,
      ...ledTeams.map((team) => team.id)
    );

    return NextResponse.json(requests);
  }

  if (!session.user.linkedMemberId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const requests = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, memberId, memberName, teamId, teamName, status, createdAt, updatedAt
      FROM "TeamJoinRequest"
      WHERE memberId = ? AND deletedAt IS NULL
      ORDER BY createdAt DESC
    `,
    session.user.linkedMemberId
  );

  return NextResponse.json(requests);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.linkedMemberId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'groups', 'request')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);

  const { teamId } = await request.json();
  if (typeof teamId !== 'string' || !teamId.trim()) {
    return NextResponse.json({ error: 'Time inválido.' }, { status: 400 });
  }

  const memberId = session.user.linkedMemberId;

  const [member] = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; teamIds: string | null }>>(
    `
      SELECT id, name, teamIds
      FROM "Member"
      WHERE id = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    memberId
  );

  if (!member) {
    return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });
  }

  const [team] = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
    `
      SELECT id, name
      FROM "Team"
      WHERE id = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    teamId
  );

  if (!team) {
    return NextResponse.json({ error: 'Time não encontrado.' }, { status: 404 });
  }

  const currentTeamIds = member.teamIds
    ? member.teamIds.split(',').map((value) => value.trim()).filter(Boolean)
    : [];

  if (currentTeamIds.includes(teamId)) {
    return NextResponse.json({ error: 'Você já participa desta equipe.' }, { status: 409 });
  }

  const [existingRequest] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      SELECT id
      FROM "TeamJoinRequest"
      WHERE memberId = ? AND teamId = ? AND status = 'pending' AND deletedAt IS NULL
      LIMIT 1
    `,
    memberId,
    teamId
  );

  if (existingRequest) {
    return NextResponse.json({ error: 'Já existe uma solicitação pendente para esta equipe.' }, { status: 409 });
  }

  const id = generateId();
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "TeamJoinRequest" (id, memberId, memberName, teamId, teamName, status, createdAt, updatedAt, deletedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    member.id,
    member.name,
    team.id,
    team.name,
    'pending',
    now,
    now,
    null
  );

  await notifyTeamJoinRequest(prisma, session.user.tenantId, {
    requestId: id,
    memberName: member.name,
    teamId: team.id,
    teamName: team.name,
  });

  return NextResponse.json({ success: true, id }, { status: 201 });
}
