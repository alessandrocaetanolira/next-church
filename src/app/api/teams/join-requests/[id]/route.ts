import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { ensureGroupTeamCompatibility } from '@/lib/group-team-compat';
import { generateId } from '@/lib/id';

function parseTeamIds(value: string | null | undefined) {
  if (!value) return [] as string[];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = session?.user?.role?.toUpperCase();

  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { action } = await request.json();
  const { id } = await params;
  if (!['approve', 'reject'].includes(String(action))) {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  await ensureGroupTeamCompatibility(prisma);

  const [joinRequest] = await prisma.$queryRawUnsafe<Array<{
    id: string;
    memberId: string;
    teamId: string;
    status: string;
  }>>(
    `
      SELECT id, memberId, teamId, status
      FROM "TeamJoinRequest"
      WHERE id = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    id
  );

  if (!joinRequest) {
    return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
  }

  if (joinRequest.status !== 'pending') {
    return NextResponse.json({ error: 'Solicitação já processada.' }, { status: 409 });
  }

  if (action === 'approve') {
    const [member] = await prisma.$queryRawUnsafe<Array<{ id: string; teamIds: string | null }>>(
      `SELECT id, teamIds FROM "Member" WHERE id = ? AND deletedAt IS NULL LIMIT 1`,
      joinRequest.memberId
    );

    if (member) {
      const nextTeamIds = Array.from(new Set([...parseTeamIds(member.teamIds), joinRequest.teamId]));
      await prisma.$executeRawUnsafe(
        `UPDATE "Member" SET "teamIds" = ?, "updatedAt" = ? WHERE id = ?`,
        nextTeamIds.join(','),
        new Date().toISOString(),
        member.id
      );

      const [existingMembership] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT id
          FROM "GroupMember"
          WHERE groupId = ? AND memberId = ? AND deletedAt IS NULL
          LIMIT 1
        `,
        joinRequest.teamId,
        member.id
      );

      if (!existingMembership) {
        await prisma.$executeRawUnsafe(
          `
            INSERT INTO "GroupMember" (id, groupId, memberId, role, createdAt, updatedAt, deletedAt)
            VALUES (?, ?, ?, 'member', ?, ?, NULL)
          `,
          generateId(),
          joinRequest.teamId,
          member.id,
          new Date().toISOString(),
          new Date().toISOString()
        );
      }
    }
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "TeamJoinRequest" SET "status" = ?, "updatedAt" = ? WHERE id = ?`,
    action === 'approve' ? 'approved' : 'rejected',
    new Date().toISOString(),
    id
  );

  return NextResponse.json({ success: true });
}
