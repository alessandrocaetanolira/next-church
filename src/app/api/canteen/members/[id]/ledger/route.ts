import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';

type LedgerRow = {
  id: string;
  memberId: string;
  memberName: string | null;
  type: string;
  amount: number;
  saleId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = session?.user?.role?.toUpperCase();
  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR', 'CANTEEN'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await context.params;
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const member = await prisma.member.findFirst({
    where: { id, deletedAt: null },
  });

  if (!member) {
    return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
  }

  const ledger = await prisma.$queryRawUnsafe<LedgerRow[]>(
    `
      SELECT
        id, memberId, memberName, type, amount, saleId, notes, createdBy, createdAt, updatedAt, deletedAt
      FROM "CreditTransaction"
      WHERE memberId = ? AND deletedAt IS NULL
      ORDER BY createdAt DESC
    `,
    id
  );

  const totals = ledger.reduce(
    (acc, entry) => {
      if (entry.type === 'debit') acc.debits += entry.amount;
      if (entry.type === 'payment') acc.payments += entry.amount;
      return acc;
    },
    { debits: 0, payments: 0 }
  );

  return NextResponse.json({
    member: {
      ...member,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
      deletedAt: member.deletedAt?.toISOString() ?? null,
    },
    summary: {
      debits: totals.debits,
      payments: totals.payments,
      balance: member.creditBalance ?? 0,
    },
    entries: ledger.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      deletedAt: entry.deletedAt?.toISOString() ?? null,
    })),
  });
}
