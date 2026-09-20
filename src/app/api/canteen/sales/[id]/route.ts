import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { notifyMemberOrderUpdate } from '@/lib/server/notification-service';
import { generateId } from '@/lib/id';
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'canteen', 'operate')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await context.params;
  const { action, paymentMethod, orderStatus } = await request.json();
  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const [sale] = await prisma.$queryRawUnsafe<Array<{
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
    id
  );

  if (!sale) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  if (action === 'reject') {
    await prisma.$executeRawUnsafe(
      `UPDATE "Sale" SET "paymentMethod" = ?, "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`,
      'cancelled',
      'cancelled',
      new Date().toISOString(),
      id
    );

    const [rejected] = await prisma.$queryRawUnsafe<Array<typeof sale>>(
      `
        SELECT
          id, total, paymentMethod, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
        FROM "Sale"
        WHERE id = ?
        LIMIT 1
      `,
      id
    );

    await notifyMemberOrderUpdate(prisma, tenantId, {
      saleId: rejected.id,
      memberId: rejected.memberId,
      type: 'canteen-order-cancelled',
      title: 'Pedido cancelado',
      message: `Seu pedido #${rejected.id.slice(-4)} foi cancelado pela cantina.`,
    });

    return NextResponse.json(parseSale(rejected));
  }

  if (action === 'status') {
    const normalizedOrderStatus =
      orderStatus === 'preparing' || orderStatus === 'ready' || orderStatus === 'cancelled'
        ? orderStatus
        : null;

    await prisma.$executeRawUnsafe(
      `UPDATE "Sale" SET "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`,
      normalizedOrderStatus,
      new Date().toISOString(),
      id
    );

    const [updatedSale] = await prisma.$queryRawUnsafe<Array<typeof sale>>(
      `
        SELECT
          id, total, paymentMethod, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
        FROM "Sale"
        WHERE id = ?
        LIMIT 1
      `,
      id
    );

    if (normalizedOrderStatus === 'preparing') {
      await notifyMemberOrderUpdate(prisma, tenantId, {
        saleId: updatedSale.id,
        memberId: updatedSale.memberId,
        type: 'canteen-order-preparing',
        title: 'Pedido em preparo',
        message: `Seu pedido #${updatedSale.id.slice(-4)} entrou em preparo.`,
      });
    }

    if (normalizedOrderStatus === 'ready') {
      await notifyMemberOrderUpdate(prisma, tenantId, {
        saleId: updatedSale.id,
        memberId: updatedSale.memberId,
        type: 'canteen-order-ready',
        title: 'Pedido pronto',
        message: `Seu pedido #${updatedSale.id.slice(-4)} está pronto para retirada.`,
      });
    }

    if (normalizedOrderStatus === 'cancelled') {
      await notifyMemberOrderUpdate(prisma, tenantId, {
        saleId: updatedSale.id,
        memberId: updatedSale.memberId,
        type: 'canteen-order-cancelled',
        title: 'Pedido cancelado',
        message: `Seu pedido #${updatedSale.id.slice(-4)} foi cancelado.`,
      });
    }

    return NextResponse.json(parseSale(updatedSale));
  }

  if (action === 'approve') {
    if (!paymentMethod || paymentMethod === 'pending') {
      return NextResponse.json({ error: 'Forma de pagamento inválida' }, { status: 400 });
    }

    const items = JSON.parse(sale.items || '[]') as Array<{ productId?: string; quantity?: number }>;

    const approved = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE "Sale" SET "paymentMethod" = ?, "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`,
        paymentMethod,
        'preparing',
        new Date().toISOString(),
        id
      );

      for (const item of items) {
        if (item.productId && item.quantity) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
          });
        }
      }

      if (paymentMethod === 'fiado' && sale.memberId) {
        await tx.member.update({
          where: { id: sale.memberId },
          data: {
            creditBalance: { increment: sale.total },
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
          sale.memberId,
          sale.memberName ?? null,
          'debit',
          sale.total,
          sale.id,
          'Pedido aprovado em fiado',
          session.user?.name || 'Sistema',
          new Date().toISOString(),
          new Date().toISOString()
        );

        const updatedMember = await tx.member.findUnique({
          where: { id: sale.memberId },
          select: { id: true, name: true, creditBalance: true },
        });
        console.info('[canteen-fiado] credit updated on approve', {
          saleId: sale.id,
          memberId: sale.memberId,
          memberName: sale.memberName,
          total: sale.total,
          creditBalance: updatedMember?.creditBalance ?? null,
        });
      }

      const [updatedSale] = await tx.$queryRawUnsafe<Array<typeof sale>>(
        `
          SELECT
            id, total, paymentMethod, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
          FROM "Sale"
          WHERE id = ?
          LIMIT 1
        `,
        id
      );

      return updatedSale;
    });

    console.info('[canteen-fiado] sale approved', {
      saleId: approved.id,
      paymentMethod,
      orderStatus: approved.orderStatus ?? null,
      memberId: approved.memberId,
      memberName: approved.memberName,
      total: approved.total,
    });

    await notifyMemberOrderUpdate(prisma, tenantId, {
      saleId: approved.id,
      memberId: approved.memberId,
      type: 'canteen-order-approved',
      title: 'Pedido aprovado',
      message: `Seu pedido #${approved.id.slice(-4)} foi aprovado e está em preparo.`,
    });

    return NextResponse.json(parseSale(approved));
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
