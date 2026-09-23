import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { hasActionPermission } from '@/lib/access-control';

function parseSale(sale: {
  items: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  id: string;
  total: number;
  paymentMethod: string;
  orderStatus?: string | null;
  memberId: string | null;
  memberName: string | null;
  createdBy: string;
}) {
  return {
    ...sale,
    items: JSON.parse(sale.items || '[]'),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    deletedAt: sale.deletedAt?.toISOString() ?? null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'members', 'view')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const prisma = getTenantClient(session.user.tenantId);

  const member = await prisma.member.findFirst({
    where: {
      email: session.user.email,
      deletedAt: null,
    },
  });

  if (!member) {
    return NextResponse.json({ member: null, sales: [] });
  }

  const sales = await prisma.$queryRawUnsafe<Array<{
    id: string;
    total: number;
    paymentMethod: string;
    orderStatus: string | null;
    items: string;
    memberId: string | null;
    memberName: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>>(
    `
      SELECT
        id, total, paymentMethod, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
      FROM "Sale"
      WHERE memberId = ? AND deletedAt IS NULL
      ORDER BY createdAt DESC
      LIMIT 50
    `,
    member.id
  );

  return NextResponse.json({
    member: {
      ...member,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
      deletedAt: member.deletedAt?.toISOString() ?? null,
    },
    sales: sales.map(parseSale),
  });
}
