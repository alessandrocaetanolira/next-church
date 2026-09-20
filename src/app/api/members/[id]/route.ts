/**
 * api/members/[id]/route.ts
 * 
 * Gerenciamento individual de membro.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { normalizeMemberInput, validateMemberInput } from '@/features/members/lib/member-registration';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { hasActionPermission } from '@/lib/access-control';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId || !hasActionPermission(session.user, 'members', 'view')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const { id } = await params;

  try {
    const [member, users] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{
        id: string;
        name: string;
        email: string;
        phone: string;
        teamIds: string | null;
        parentPhone: string | null;
        birthDate: Date | null;
        conversionDate: Date | null;
        baptismDate: Date | null;
        previousChurch: string | null;
        aboutMe: string | null;
        maritalStatus: string | null;
        approved: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>>(
        `
          SELECT id, name, email, phone, teamIds, parentPhone, birthDate, conversionDate, baptismDate, previousChurch, aboutMe, maritalStatus, approved, createdAt, updatedAt
          FROM "Member"
          WHERE id = ? AND deletedAt IS NULL
          LIMIT 1
        `,
        id
      ),
      prisma.user.findMany({ where: { deletedAt: null } }),
    ]);

    const found = member[0];
    if (!found) {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    }

    const linkedUser =
      users.find((user) => user.linkedMemberId === found.id) ??
      users.find((user) => user.email === found.email);

    return NextResponse.json({
      ...found,
      teamIds: found.teamIds
        ? found.teamIds.split(',').map((teamId: string) => teamId.trim()).filter(Boolean)
        : [],
      userId: linkedUser?.id ?? null,
      role: linkedUser?.role ?? null,
      permissions: linkedUser?.permissions
        ? linkedUser.permissions.split(',').map((permission) => permission.trim()).filter(Boolean)
        : [],
      hasAccess: Boolean(linkedUser),
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar membro' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId || !hasActionPermission(session.user, 'members', 'update')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const data = normalizeMemberInput(await request.json());
  const validationError = validateMemberInput(data);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const { id } = await params;

  try {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "Member"
        SET
          name = ?,
          email = ?,
          phone = ?,
          parentPhone = ?,
          teamIds = COALESCE(teamIds, NULL),
          birthDate = ?,
          conversionDate = ?,
          baptismDate = ?,
          previousChurch = ?,
          aboutMe = ?,
          maritalStatus = ?,
          approved = ?,
          updatedAt = ?
        WHERE id = ?
      `,
      data.name,
      data.email,
      data.phone,
      data.parentPhone ?? null,
      data.birthDate?.toISOString() ?? null,
      data.conversionDate?.toISOString() ?? null,
      data.baptismDate?.toISOString() ?? null,
      data.previousChurch ?? null,
      data.aboutMe ?? null,
      data.maritalStatus ?? null,
      data.approved ?? true,
      new Date().toISOString(),
      id
    );
    const member = await prisma.member.findUnique({ where: { id } });
    return NextResponse.json(member);
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar membro' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId || !hasActionPermission(session.user, 'members', 'delete')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const { id } = await params;

  try {
    await prisma.member.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir membro' }, { status: 500 });
  }
}
