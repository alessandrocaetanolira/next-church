import type { Prisma, PrismaClient } from '@/generated/prisma-tenant';
import { ConflictError, DomainError } from '@/lib/http/errors';
import type { SyncBinding, SyncPushChange } from './sync-push.contract';

/** Recibo e mutação pertencem à mesma transação. Não existe sucesso parcial persistido. */
export class SyncPushRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async taskAccess(tx: Prisma.TransactionClient, memberId: string | null | undefined, id: string) {
    const [member, task] = await Promise.all([
      memberId ? tx.member.findFirst({ where: { id: memberId, active: true, approved: true, deletedAt: null }, select: { teamIds: true } }) : null,
      tx.task.findUnique({ where: { id }, select: { teamId: true } }),
    ]);
    return { teamIds: (member?.teamIds ?? '').split(',').map((value) => value.trim()).filter(Boolean), currentTeamId: task?.teamId ?? null };
  }

  activeMember(tx: Prisma.TransactionClient, id: string) {
    return tx.member.findFirst({ where: { id, active: true, approved: true, deletedAt: null }, select: { id: true } });
  }

  async run(change: SyncPushChange, binding: SyncBinding,
    authorize: (tx: Prisma.TransactionClient) => Promise<void>, execute: (tx: Prisma.TransactionClient) => Promise<unknown>) {
    return this.prisma.$transaction(async (tx) => {
      await authorize(tx);
      const previous = await tx.syncOperation.findUnique({ where: { idempotencyKey: change.idempotencyKey } });
      if (previous) {
        let receipt: { protocol?: number; binding?: SyncBinding } = {};
        try { const parsed = JSON.parse(previous.responseJson ?? '{}'); receipt = parsed && typeof parsed === 'object' ? parsed : {}; } catch { /* Recibo antigo/corrompido nunca é sucesso verificável. */ }
        if (previous.status !== 'success' || receipt.protocol !== 2 || !receipt.binding
          || (Object.keys(binding) as Array<keyof SyncBinding>).some((key) => receipt.binding?.[key] !== binding[key])) {
          throw new DomainError('Chave já utilizada por outra operação ou sem vínculo verificável. Confira o resultado antes de repetir.', 'CONFLICT', { reason: 'idempotency' });
        }
        return { replayed: true };
      }

      if (change.action !== 'create' && typeof change.data.id === 'string' && typeof change.data.updatedAt === 'string') {
        const where = { where: { id: change.data.id }, select: { updatedAt: true } } as const;
        const record = change.module === 'sales' ? await tx.sale.findUnique(where)
          : change.module === 'products' ? await tx.product.findUnique(where)
          : change.module === 'tasks' ? await tx.task.findUnique(where) : null;
        const localTime = new Date(change.data.updatedAt).getTime();
        if (!Number.isFinite(localTime)) throw new ConflictError('Versão local inválida. Atualize o registro.');
        if (record && new Date(record.updatedAt).getTime() > localTime) {
          throw new DomainError('O registro foi alterado no servidor.', 'CONFLICT', { serverUpdatedAt: new Date(record.updatedAt).toISOString() });
        }
      }

      const responseJson = JSON.stringify({ protocol: 2, binding });
      await tx.syncOperation.create({ data: { idempotencyKey: change.idempotencyKey, status: 'processing', responseJson } });
      await execute(tx);
      await tx.syncOperation.update({ where: { idempotencyKey: change.idempotencyKey }, data: { status: 'success', responseJson } });
      return { replayed: false };
    }, { timeout: 20_000 });
  }
}
