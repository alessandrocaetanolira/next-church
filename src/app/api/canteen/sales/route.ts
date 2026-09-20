/**
 * api/canteen/sales/route.ts
 * 
 * Processamento de vendas e controle de estoque.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { notifyCanteenNewOrder } from '@/lib/server/notification-service';
import { generateId } from '@/lib/id';
import { hasActionPermission } from '@/lib/access-control';
import { getCanteenStatus } from '@/lib/server/canteen-operation';

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
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'canteen', 'view')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);

  try {
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
        WHERE deletedAt IS NULL
        ORDER BY createdAt DESC
        LIMIT 50
      `
    );
    return NextResponse.json(sales.map(parseSale));
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar vendas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const canSell = hasActionPermission(session.user, 'canteen', 'sell');
  const canOrder = hasActionPermission(session.user, 'canteen', 'order');
  if (!canSell && !canOrder) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id, items, total, paymentMethod, orderStatus, memberId, memberName, createdBy, createdAt } = await request.json();
  const status = await getCanteenStatus(getTenantClient(session.user.tenantId));
  if (!status.isOpen) return NextResponse.json({ error: 'A cantina está fechada no momento.' }, { status: 409 });
  if (!canSell && (paymentMethod !== 'pending' || orderStatus !== 'pending')) {
    return NextResponse.json({ error: 'Membros devem enviar pedidos para aprovação da cantina.' }, { status: 403 });
  }
  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);

  try {
    console.info('[canteen-fiado] create sale request', {
      tenantId,
      id,
      paymentMethod,
      orderStatus: typeof orderStatus === 'string' ? orderStatus : null,
      memberId,
      memberName,
      total,
      itemsCount: Array.isArray(items) ? items.length : 0,
    });

    // Transação para garantir consistência (Venda + Estoque + Saldo)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar a venda
      const sale = await tx.sale.create({
        data: {
          ...(typeof id === 'string' && id ? { id } : {}),
          total,
          paymentMethod,
          items: JSON.stringify(items), // Persistir itens como JSON
          memberId,
          memberName,
          createdBy: createdBy || session.user?.name || 'Sistema',
          ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
        },
      });

      await tx.$executeRawUnsafe(
        `UPDATE "Sale" SET "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`,
        typeof orderStatus === 'string' ? orderStatus : null,
        new Date().toISOString(),
        sale.id
      );

      // 2. Atualizar estoque apenas quando a venda já foi aprovada
      if (paymentMethod !== 'pending') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const item of items as any[]) {
          if (item.productId && item.quantity) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: item.quantity },
              },
            });
          }
        }
      }

      // 3. Se for fiado, atualizar saldo do membro
      if (paymentMethod === 'fiado' && memberId) {
        await tx.member.update({
          where: { id: memberId },
          data: {
            creditBalance: { increment: total },
          },
        });

        await tx.$executeRawUnsafe(
          `
            INSERT INTO "CreditTransaction" (
              id, memberId, memberName, type, amount, saleId, notes, createdBy, createdAt, updatedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          generateId(),
          memberId,
          memberName ?? null,
          'debit',
          total,
          sale.id,
          'Venda em fiado',
          createdBy || session.user?.name || 'Sistema',
          createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
          new Date().toISOString()
        );

        const updatedMember = await tx.member.findUnique({
          where: { id: memberId },
          select: { id: true, name: true, creditBalance: true },
        });
        console.info('[canteen-fiado] credit updated on sale create', {
          saleId: sale.id,
          memberId,
          memberName,
          total,
          creditBalance: updatedMember?.creditBalance ?? null,
        });
      }

      const [createdSale] = await tx.$queryRawUnsafe<Array<{
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
          WHERE id = ?
          LIMIT 1
        `,
        sale.id
      );

      return createdSale;
    });

    if (paymentMethod === 'pending') {
      await notifyCanteenNewOrder(prisma, tenantId, {
        id: result.id,
        memberName: result.memberName,
        total: result.total,
      });
    }

    console.info('[canteen-fiado] sale created', {
      saleId: result.id,
      paymentMethod: result.paymentMethod,
      orderStatus: result.orderStatus ?? null,
      memberId: result.memberId,
      memberName: result.memberName,
      total: result.total,
    });

    return NextResponse.json(parseSale(result));
  } catch (error) {
    console.error('Erro ao processar venda:', error);
    return NextResponse.json({ error: 'Erro ao processar venda' }, { status: 500 });
  }
}
