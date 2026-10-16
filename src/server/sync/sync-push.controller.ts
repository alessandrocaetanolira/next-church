import { hasPlanFeature } from '@/lib/access-control';
import { ForbiddenError, UnauthenticatedError, ValidationError } from '@/lib/http/errors';
import { getTenantClient } from '@/lib/prisma-factory';
import { CanteenSalesRepository } from '@/server/canteen/sales.repository';
import { CanteenSalesService } from '@/server/canteen/sales.service';
import { CanteenSalesDetailService } from '@/server/canteen/sales-detail.service';
import { CanteenProductsRepository } from '@/server/canteen/products.repository';
import { CanteenProductsService } from '@/server/canteen/products.service';
import { TasksRepository } from '@/server/tasks/tasks.repository';
import { TasksService } from '@/server/tasks/tasks.service';
import { MemberCreditsRepository } from '@/server/member-credits/member-credits.repository';
import { MemberCreditsService } from '@/server/member-credits/member-credits.service';
import { SyncPushRepository } from './sync-push.repository';
import { SyncPushService, type SyncPushUser } from './sync-push.service';

/** Composição dos domínios fora da rota; cada repository recebe a mesma transação. */
export function pushSync(user: SyncPushUser | null | undefined, input: unknown) {
  if (!user?.tenantId || (!user.id && !user.email)) throw new UnauthenticatedError();
  if (!hasPlanFeature(user, 'offline_sync')) throw new ForbiddenError('Recurso não disponível no plano.');
  const changes = input && typeof input === 'object' ? (input as { changes?: unknown }).changes : null;
  if (!Array.isArray(changes) || changes.length > 100) throw new ValidationError('Envie um lote de até 100 operações.');
  const prisma = getTenantClient(user.tenantId);
  const actor = user.name ?? user.email ?? 'Sistema';
  const service = new SyncPushService(new SyncPushRepository(prisma), async (change, tx, afterCommit) => {
    if (change.module === 'sales') {
      const repository = new CanteenSalesRepository(tx);
      return change.action === 'create'
        ? new CanteenSalesService(repository, prisma, user.tenantId!, afterCommit, tx).create(change.data, user)
        : new CanteenSalesDetailService(repository, prisma, user.tenantId!, afterCommit).execute(String(change.data.id ?? ''), change.data, actor);
    }
    if (change.module === 'products') {
      const products = new CanteenProductsService(new CanteenProductsRepository(tx), user.tenantSlug ?? user.tenantId!);
      const id = typeof change.data.id === 'string' ? change.data.id : '';
      if (!id.trim()) throw new ValidationError('Identificador do produto é obrigatório.');
      if (change.action === 'create') return products.create(change.data);
      if (change.action === 'update') return products.update(id, change.data);
      return products.remove(id);
    }
    if (change.module === 'tasks') return new TasksService(new TasksRepository(tx)).sync(change.action, change.data);
    return new MemberCreditsService(new MemberCreditsRepository(tx)).sync(change.data, actor);
  });
  return service.push(user, changes);
}
