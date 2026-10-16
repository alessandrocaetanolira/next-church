import { notifyCanteenNewOrder, notifyMemberCreditUpdate } from '@/lib/server/notification-service';
import { ValidationError, ConflictError } from '@/lib/http/errors';
import { ForbiddenError } from '@/lib/http/errors';
import { hasActionPermission } from '@/lib/access-control';
import { generateId } from '@/lib/id';
import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { getCanteenStatus } from '@/lib/server/canteen-operation';
import { CanteenSalesRepository, type SaleItem } from './sales.repository';
import { getCanteenAccess } from '@/lib/canteen/access';
import type { AfterCommit, TenantDatabase } from '@/infra/database/tenant-transaction';

type User = { email?: string | null; name?: string | null; role?: string | null; permissions?: string[] | string | null; planFeatures?: string[] | string | null; linkedMemberId?: string | null };

export class CanteenSalesService {
  constructor(
    private readonly repository: CanteenSalesRepository,
    private readonly prisma: TenantPrismaClient,
    private readonly tenantId: string,
    private readonly afterCommit?: AfterCommit,
    private readonly statusDatabase?: TenantDatabase,
  ) {}

  list() { return this.repository.list(); }

  /** Pull pessoal nunca entrega vendas de terceiros; sem vínculo/permissão, nenhum registro é consultado. */
  changes(since: Date, user: User) {
    const access = getCanteenAccess(user);
    if (access.canViewSales) return this.repository.listChanges(since);
    if (access.canOrder && user.linkedMemberId) return this.repository.listChanges(since, user.linkedMemberId);
    return Promise.resolve([]);
  }

  async create(input: unknown, user: User) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    if (body.intent !== undefined && body.intent !== 'purchase' && body.intent !== 'sale') {
      throw new ValidationError('Intenção de compra ou venda inválida.');
    }
    const items = Array.isArray(body.items) ? body.items : [];
    const total = Number(body.total);
    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : '';
    const requestedConsumerType = body.consumerType === 'VISITOR' || body.consumerType === 'UNIDENTIFIED' || body.consumerType === 'MEMBER'
      ? body.consumerType
      : null;
    const orderStatus = typeof body.orderStatus === 'string' ? body.orderStatus : null;
    if (!items.length || !Number.isFinite(total) || total < 0 || !paymentMethod) {
      throw new ValidationError('Itens, total e forma de pagamento são obrigatórios.');
    }

    const normalizedItems: SaleItem[] = items.map((item) => {
      const value = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const quantity = Number(value.quantity);
      const price = Number(value.price);
      if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0 || typeof value.name !== 'string') {
        throw new ValidationError('Itens da venda inválidos.');
      }
      return { productId: typeof value.productId === 'string' ? value.productId : undefined, name: value.name, quantity, price };
    });

    const status = await getCanteenStatus(this.statusDatabase ?? this.prisma);
    if (!status.isOpen) throw new ConflictError('A cantina está fechada no momento.');

    const canSell = hasActionPermission(user, 'canteen', 'sell');
    const personalOrder = body.intent === 'purchase' || !canSell;
    if (personalOrder && !hasActionPermission(user, 'canteen', 'order')) {
      throw new ForbiddenError('Você não tem permissão para fazer pedidos.');
    }
    if (personalOrder && (paymentMethod !== 'pending' || orderStatus !== 'pending')) {
      throw new ForbiddenError('Membros devem enviar pedidos para aprovação da cantina.');
    }
    if (personalOrder && !user.linkedMemberId) {
      throw new ForbiddenError('Seu usuário ainda não está vinculado a um membro da igreja.');
    }
    const purchaser = personalOrder ? await this.repository.findPurchaser(user.linkedMemberId!) : null;
    if (personalOrder && !purchaser) throw new ForbiddenError('Seu vínculo de membro não está ativo ou aprovado.');

    const memberId = personalOrder ? purchaser!.id : (typeof body.memberId === 'string' && body.memberId ? body.memberId : null);
    const consumerType = personalOrder ? 'MEMBER' : (requestedConsumerType ?? (memberId ? 'MEMBER' : 'UNIDENTIFIED'));
    if (consumerType === 'VISITOR' || consumerType === 'UNIDENTIFIED') {
      if (memberId) throw new ValidationError('Venda de visitante não pode possuir membro vinculado.');
      if (paymentMethod === 'fiado') throw new ValidationError('Fiado está disponível somente para membros cadastrados.');
    }

    const result = await this.repository.create({
      id: typeof body.id === 'string' && body.id ? body.id : undefined,
      total,
      paymentMethod,
      consumerType,
      orderStatus,
      items: normalizedItems,
      memberId,
      memberName: personalOrder ? purchaser!.name : consumerType === 'MEMBER' && typeof body.memberName === 'string' ? body.memberName : null,
      createdBy: personalOrder ? user.email ?? user.name ?? 'Membro' : user.name ?? user.email ?? 'Sistema',
      createdAt: typeof body.createdAt === 'string' ? new Date(body.createdAt) : undefined,
    });

    if (paymentMethod === 'pending') {
      await this.deliver(() => notifyCanteenNewOrder(this.prisma, this.tenantId, { id: result.id, memberName: result.memberName, total: result.total }));
    }
    if (paymentMethod === 'fiado' && result.memberId) {
      await this.deliver(() => notifyMemberCreditUpdate(this.prisma, this.tenantId, {
        memberId: result.memberId!,
        type: 'canteen-credit-debit',
        title: 'Nova cobrança na cantina',
        message: `Foi lançada uma cobrança de R$ ${result.total.toFixed(2)} no seu saldo da cantina.`,
        sender: { name: result.createdBy },
        sourceId: result.id,
      }));
    }
    return result;
  }

  private async deliver(effect: () => Promise<unknown>) {
    if (this.afterCommit) this.afterCommit(effect);
    else await effect();
  }
}
