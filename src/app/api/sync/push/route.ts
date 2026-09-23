/**
 * app/api/sync/push/route.ts
 * 
 * Rota para envio de dados locais para o servidor (Push).
 * Processa a fila de saída do Dexie.
 */

import { NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";
import { hasActionPermission } from '@/lib/access-control';
import { createSale } from '@/server/canteen/sales.controller';
import { CanteenSalesRepository } from '@/server/canteen/sales.repository';
import { CanteenSalesService } from '@/server/canteen/sales.service';
import { syncProduct } from '@/server/canteen/products.controller';
import { CanteenProductsRepository } from '@/server/canteen/products.repository';
import { CanteenProductsService } from '@/server/canteen/products.service';
import { TasksRepository } from '@/server/tasks/tasks.repository';
import { TasksService } from '@/server/tasks/tasks.service';
import { syncTask } from '@/server/tasks/tasks.controller';
import { getTeamScopedAccess } from '@/lib/server/team-scope';
import { syncMemberCredits } from '@/server/member-credits/member-credits.controller';
import { MemberCreditsRepository } from '@/server/member-credits/member-credits.repository';
import { MemberCreditsService } from '@/server/member-credits/member-credits.service';

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
  const tasksRepository = new TasksRepository(prisma);
  const tasksService = new TasksService(tasksRepository);
  const tasksScope = await getTeamScopedAccess(session, 'tasks');
  const productsRepository = new CanteenProductsRepository(prisma);
  const productsService = new CanteenProductsService(productsRepository, session.user.tenantSlug ?? session.user.tenantId);
  const memberCreditsService = new MemberCreditsService(new MemberCreditsRepository(prisma));
  const salesService = new CanteenSalesService(new CanteenSalesRepository(prisma), prisma, tenantId);
  const results = [];

  for (const change of changes) {
    try {
      const idempotencyKey = typeof change.idempotencyKey === 'string' ? change.idempotencyKey : null;
      if (idempotencyKey) {
        const [previous] = await prisma.$queryRawUnsafe<Array<{ status: string; responseJson: string | null }>>(
          `SELECT status, responseJson FROM "SyncOperation" WHERE idempotencyKey = ? LIMIT 1`, idempotencyKey,
        );
        if (previous?.status === 'success') {
          results.push({ id: change.id, status: 'success', replayed: true });
          continue;
        }
      }
      if (change.module === 'sales' && change.action === 'create') {
        await createSale({ user: session.user, service: salesService }, change.data);
        results.push({ id: change.id, status: 'success' });
      } else if (change.module === 'memberCredits' && change.action === 'update') {
        await syncMemberCredits(session.user, memberCreditsService, change.data, session.user?.name || 'Sistema');
        results.push({ id: change.id, status: 'success' });
      } else if (change.module === 'products' && (change.action === 'create' || change.action === 'update' || change.action === 'delete')) {
        await syncProduct({ user: session.user, service: productsService }, change.action, change.data);
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
        if (!taskAction || (hasAuthorizationMetadata && !hasActionPermission(session.user, 'tasks', taskAction))) {
          results.push({ id: change.id, status: 'forbidden', error: 'Sem permissão para esta operação em tarefas' });
          continue;
        }
        await syncTask({ user: session.user, service: tasksService, repository: tasksRepository, scope: tasksScope, legacyCompatible: !hasAuthorizationMetadata }, taskAction, change.data);
        results.push({ id: change.id, status: 'success' });
      } else {
        results.push({ id: change.id, status: 'ignored' });
      }
      const result = results[results.length - 1];
      if (idempotencyKey && result?.id === change.id && result.status === 'success') {
        const now = new Date().toISOString();
        await prisma.$executeRawUnsafe(
          `INSERT INTO "SyncOperation" (id, idempotencyKey, status, responseJson, createdAt, updatedAt)
           VALUES (?, ?, 'success', ?, ?, ?)
           ON CONFLICT(idempotencyKey) DO UPDATE SET status='success', responseJson=excluded.responseJson, updatedAt=excluded.updatedAt`,
          `sync_${idempotencyKey}`, idempotencyKey, JSON.stringify(result), now, now,
        );
      }
      // Adicionar outros módulos conforme necessidade
    } catch (error) {
      console.error("Sync Error:", error);
      results.push({ id: change.id, status: 'error', error: String(error) });
    }
  }

  return NextResponse.json({ results });
}
