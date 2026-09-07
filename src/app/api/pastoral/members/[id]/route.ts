import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';

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
  const tenantDatabaseKey = session.user.tenantId;
  const tenantPrisma = getTenantClient(tenantDatabaseKey);
  await ensureTenantSchemaExtensions(tenantPrisma);

  const members = await tenantPrisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, name, email, passwordHash, approved
      FROM "Member"
      WHERE id = ?
        AND deletedAt IS NULL
      LIMIT 1
    `,
    id
  );

  const member = members[0];
  if (!member) {
    return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });
  }

  if (action === 'reject') {
    await tenantPrisma.member.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  }

  if (action !== 'approve') {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }

  const passwordHash = typeof member.passwordHash === 'string' ? member.passwordHash : '';
  if (!passwordHash) {
    return NextResponse.json({ error: 'Cadastro sem senha válida para aprovação.' }, { status: 400 });
  }

  const existingTenantUser = await tenantPrisma.user.findUnique({
    where: { email: String(member.email) },
  });

  if (!existingTenantUser) {
    await tenantPrisma.user.create({
      data: {
        name: String(member.name),
        email: String(member.email),
        passwordHash,
        role: 'MEMBER',
        permissions: '',
        linkedMemberId: String(member.id),
        active: true,
      },
    });
  }

  await tenantPrisma.member.update({
    where: { id },
    data: {
      approved: true,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
