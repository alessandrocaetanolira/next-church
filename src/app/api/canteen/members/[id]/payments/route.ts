import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { generateId } from '@/lib/id';
import { hasActionPermission } from '@/lib/access-control';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = session?.user?.role?.toUpperCase();
  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR', 'CANTEEN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'canteen', 'operate')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await context.params;
  const { amount } = await request.json();
  const normalizedAmount = Number(amount);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const member = await prisma.member.findFirst({
    where: { id, deletedAt: null },
  });

  if (!member) {
    return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
  }

  if (normalizedAmount > (member.creditBalance ?? 0)) {
    return NextResponse.json({ error: 'Valor maior que a dívida' }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedMember = await tx.member.update({
      where: { id },
      data: {
        creditBalance: { decrement: normalizedAmount },
      },
    });

    await tx.$executeRawUnsafe(
      `
        INSERT INTO "CreditTransaction" (
          id, memberId, memberName, type, amount, notes, createdBy, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      generateId(),
      id,
      updatedMember.name,
      'payment',
      normalizedAmount,
      'Pagamento manual',
      session.user?.name || 'Sistema',
      new Date().toISOString(),
      new Date().toISOString()
    );

    return updatedMember;
  });

  return NextResponse.json({
    member: {
      ...result,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      deletedAt: result.deletedAt?.toISOString() ?? null,
    },
  });
}
