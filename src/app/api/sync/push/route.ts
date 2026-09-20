/**
 * app/api/sync/push/route.ts
 * 
 * Rota para envio de dados locais para o servidor (Push).
 * Processa a fila de saída do Dexie.
 */

import { NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";
import { ensureTenantSchemaExtensions } from "@/lib/tenant-schema";
import { notifyCanteenNewOrder } from '@/lib/server/notification-service';
import { generateId } from '@/lib/id';
import { hasActionPermission } from '@/lib/access-control';

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { changes } = await request.json();
  if (!Array.isArray(changes)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  const tenantId = session.user.tenantId;
  await ensureTenantSchemaExtensions(prisma);
  const results = [];

  for (const change of changes) {
    try {
      if (change.module === 'sales' && change.action === 'create') {
        const { id, items, total, paymentMethod, orderStatus, memberId, ...data } = change.data;

        await prisma.$transaction(async (tx) => {
          const sale = await tx.sale.create({
            data: {
              ...data,
              id,
              total,
              paymentMethod,
              memberId,
              items: JSON.stringify(items ?? []),
            }
          });

          await tx.$executeRawUnsafe(
            `UPDATE "Sale" SET "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`,
            typeof orderStatus === 'string' ? orderStatus : null,
            new Date().toISOString(),
            sale.id
          );

          if (paymentMethod !== 'pending') {
            for (const item of items ?? []) {
              if (item?.productId && item?.quantity) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    stock: { decrement: item.quantity },
                  },
                });
              }
            }
          }

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
              data.memberName ?? null,
              'debit',
              total,
              id,
              'Venda em fiado sincronizada',
              data.createdBy ?? 'Sistema',
              data.createdAt ?? new Date().toISOString(),
              new Date().toISOString()
            );
          }
        });

        if (paymentMethod === 'pending') {
          await notifyCanteenNewOrder(prisma, tenantId, {
            id,
            memberName: data.memberName ?? null,
            total,
          });
        }

        results.push({ id: change.id, status: 'success' });
      } else if (change.module === 'memberCredits' && change.action === 'update') {
        const { id, creditBalance, amount, memberName } = change.data;
        if (typeof amount === 'number' && amount > 0) {
          await prisma.$transaction(async (tx) => {
            const member = await tx.member.update({
              where: { id },
              data: {
                creditBalance: { decrement: amount },
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
              memberName ?? member.name,
              'payment',
              amount,
              'Pagamento sincronizado',
              session.user?.name || 'Sistema',
              new Date().toISOString(),
              new Date().toISOString()
            );
          });
        } else {
          await prisma.member.update({
            where: { id },
            data: {
              creditBalance,
            },
          });
        }
        results.push({ id: change.id, status: 'success' });
      } else if (change.module === 'products') {
        const data = change.data;

        if (change.action === 'create') {
          await prisma.$transaction(async (tx) => {
            await tx.product.create({
              data: {
                id: data.id,
                name: data.name,
                description: data.description,
                price: data.price,
                cost: data.cost,
                stock: data.stock,
                minStock: data.minStock,
                category: data.category,
                active: data.active ?? true,
              },
            });

            await tx.$executeRawUnsafe(
              `UPDATE "Product" SET "availableToday" = ?, "imageUrl" = ?, "updatedAt" = ? WHERE id = ?`,
              data.availableToday !== false,
              typeof data.imageUrl === 'string' ? data.imageUrl : null,
              new Date().toISOString(),
              data.id
            );
          });
        } else if (change.action === 'update') {
          await prisma.product.update({
            where: { id: data.id },
            data: {
              ...(typeof data.name === 'string' ? { name: data.name } : {}),
              ...(typeof data.description === 'string' ? { description: data.description } : {}),
              ...(typeof data.price === 'number' ? { price: data.price } : {}),
              ...(typeof data.cost === 'number' ? { cost: data.cost } : {}),
              ...(typeof data.stock === 'number' ? { stock: data.stock } : {}),
              ...(typeof data.minStock === 'number' ? { minStock: data.minStock } : {}),
              ...(typeof data.category === 'string' ? { category: data.category } : {}),
              ...(typeof data.active === 'boolean' ? { active: data.active } : {}),
            },
          });

          if (typeof data.availableToday === 'boolean') {
            await prisma.$executeRawUnsafe(
              `UPDATE "Product" SET "availableToday" = ?, "updatedAt" = ? WHERE id = ?`,
              data.availableToday,
              new Date().toISOString(),
              data.id
            );
          }

          if (typeof data.imageUrl === 'string' || data.imageUrl === null) {
            await prisma.$executeRawUnsafe(
              `UPDATE "Product" SET "imageUrl" = ?, "updatedAt" = ? WHERE id = ?`,
              data.imageUrl,
              new Date().toISOString(),
              data.id
            );
          }
        } else if (change.action === 'delete') {
          await prisma.product.update({
            where: { id: data.id },
            data: { deletedAt: new Date(), updatedAt: new Date() },
          });
        }

        results.push({ id: change.id, status: 'success' });
      } else if (change.module === 'tasks') {
        const taskAction =
          change.action === 'create' || change.action === 'update' || change.action === 'delete'
            ? change.action
            : null;
        // Sessões antigas sem os novos campos de autorização continuam
        // compatíveis durante a migração; sessões atuais são sempre validadas.
        const hasAuthorizationMetadata =
          session.user.role !== undefined ||
          session.user.permissions !== undefined ||
          session.user.planFeatures !== undefined;
        if (
          !taskAction ||
          (hasAuthorizationMetadata && !hasActionPermission(session.user, 'tasks', taskAction))
        ) {
          results.push({ id: change.id, status: 'forbidden', error: 'Sem permissão para esta operação em tarefas' });
          continue;
        }
        if (change.action === 'create' || change.action === 'update') {
            await prisma.task.upsert({
                where: { id: change.data.id },
                create: change.data,
                update: change.data
            });
        } else if (change.action === 'delete') {
            await prisma.task.update({
                where: { id: change.data.id },
                data: { deletedAt: new Date() }
            });
        }
        results.push({ id: change.id, status: 'success' });
      } else {
        results.push({ id: change.id, status: 'ignored' });
      }
      // Adicionar outros módulos conforme necessidade
    } catch (error) {
      console.error("Sync Error:", error);
      results.push({ id: change.id, status: 'error', error: String(error) });
    }
  }

  return NextResponse.json({ results });
}
