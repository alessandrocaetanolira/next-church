import type { Prisma } from '@/generated/prisma-tenant';
import type { AfterCommit } from '@/infra/database/tenant-transaction';
import { hasActionPermission } from '@/lib/access-control';
import { DomainError, ForbiddenError, ValidationError } from '@/lib/http/errors';
import { serverLogger } from '@/lib/server/logger';
import { CanteenSalesPolicy } from '@/server/canteen/sales.policy';
import { CanteenSalesDetailPolicy } from '@/server/canteen/sales-detail.policy';
import { CanteenProductsPolicy } from '@/server/canteen/products.policy';
import { MemberCreditsPolicy } from '@/server/member-credits/member-credits.policy';
import { TasksPolicy } from '@/server/tasks/tasks.policy';
import { parseSyncChange, syncPayloadHash, type SyncBinding, type SyncPushChange } from './sync-push.contract';
import { SyncPushRepository } from './sync-push.repository';
import type { SyncUser } from './sync-pull.service';

export type SyncPushUser = SyncUser & { name?: string | null; tenantSlug?: string };
export type SyncExecutor = (change: SyncPushChange, tx: Prisma.TransactionClient, afterCommit: AfterCommit) => Promise<unknown>;

/** Autoriza inclusive replay. Efeitos externos são adiados até o commit e não se repetem no replay. */
export class SyncPushService {
  constructor(private readonly repository: SyncPushRepository, private readonly execute: SyncExecutor) {}

  private assertPermission(user: SyncPushUser, change: SyncPushChange) {
    if ((change.userId !== undefined && change.userId !== user.id)
      || (change.tenantId !== undefined && change.tenantId !== user.tenantId)
      || (change.data.tenantId !== undefined && change.data.tenantId !== user.tenantId)
      || (change.tenantSlug !== undefined && change.tenantSlug !== (user.tenantSlug || user.tenantId))) {
      throw new ForbiddenError('A operação pertence a outra sessão ou igreja.');
    }
    if (change.module === 'tasks') {
      if (change.action === 'create') TasksPolicy.assertCreate(user);
      else if (change.action === 'update') TasksPolicy.assertUpdate(user);
      else TasksPolicy.assertDelete(user);
    } else if (change.module === 'products') CanteenProductsPolicy.assertManage(user);
    else if (change.module === 'memberCredits') MemberCreditsPolicy.assertSync(user);
    else if (change.action === 'create') {
      CanteenSalesPolicy.assertCreate(user);
      if ((change.data.intent === 'purchase' || !hasActionPermission(user, 'canteen', 'sell'))
        && (!hasActionPermission(user, 'canteen', 'order') || !user.linkedMemberId)) throw new ForbiddenError('Sem permissão ou vínculo para pedido pessoal.');
    } else CanteenSalesDetailPolicy.assertOperate(user);
  }

  private async assertScope(user: SyncPushUser, change: SyncPushChange, tx: Prisma.TransactionClient) {
    if (change.module === 'tasks') {
      const id = typeof change.data.id === 'string' ? change.data.id : '';
      if (!id) throw new ValidationError('Identificador da tarefa é obrigatório.');
      const { teamIds, currentTeamId } = await this.repository.taskAccess(tx, user.linkedMemberId, id);
      const scope = { allowed: ['ADMIN', 'PASTOR'].includes(user.role?.toUpperCase() ?? '') || teamIds.length > 0,
        hasGlobalAccess: ['ADMIN', 'PASTOR'].includes(user.role?.toUpperCase() ?? ''), accessibleTeamIds: teamIds };
      if (currentTeamId) TasksPolicy.assertScope(scope, currentTeamId);
      TasksPolicy.assertScope(scope, change.action === 'delete' ? currentTeamId : typeof change.data.teamId === 'string' ? change.data.teamId.trim() : currentTeamId);
    }
    if (change.module === 'sales' && change.action === 'create'
      && (change.data.intent === 'purchase' || !hasActionPermission(user, 'canteen', 'sell'))
      && !await this.repository.activeMember(tx, user.linkedMemberId!)) throw new ForbiddenError('Seu vínculo de membro não está ativo ou aprovado.');
  }

  async push(user: SyncPushUser, changes: unknown[]) {
    const results = [];
    for (const input of changes) {
      const id = input && typeof input === 'object' ? (input as { id?: unknown }).id : null;
      try {
        const change = parseSyncChange(input);
        this.assertPermission(user, change);
        const binding: SyncBinding = { tenantId: user.tenantId!, actor: user.id ? `id:${user.id}` : `email:${user.email!.trim().toLowerCase()}`, memberId: user.linkedMemberId ?? null,
          module: change.module, action: change.action, hash: syncPayloadHash(change.data) };
        const effects: Array<() => Promise<unknown>> = [];
        const outcome = await this.repository.run(change, binding,
          (tx) => this.assertScope(user, change, tx),
          (tx) => this.execute(change, tx, (effect) => { effects.push(effect); }));
        if (!outcome.replayed) for (const effect of effects) {
          try { await effect(); } catch { serverLogger.warn('sync', 'Aviso pós-commit não entregue; operação já confirmada.', { module: change.module }); }
        }
        results.push({ id: change.id, status: 'success', ...(outcome.replayed ? { replayed: true } : {}) });
      } catch (error) {
        const domain = error instanceof DomainError ? error : null;
        if (!domain) serverLogger.error('sync', 'Falha na transação de sincronização.', { operationId: typeof id === 'number' || typeof id === 'string' ? id : null });
        results.push({ id, status: domain?.code === 'FORBIDDEN' ? 'forbidden' : domain?.code === 'CONFLICT' && domain.details ? 'conflict' : 'error',
          error: domain?.message ?? 'Não foi possível confirmar a operação. Tente novamente com a mesma chave.',
          ...(domain?.details && typeof domain.details === 'object' ? domain.details : {}) });
      }
    }
    return { results };
  }
}
