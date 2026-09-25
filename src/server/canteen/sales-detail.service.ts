import { notifyMemberCreditUpdate, notifyMemberOrderUpdate } from '@/lib/server/notification-service';
import { NotFoundError, ValidationError } from '@/lib/http/errors';
import { CanteenSalesRepository, parseSale } from './sales.repository';
import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

const STATUS_NOTIFICATIONS = {
  preparing: ['canteen-order-preparing', 'Pedido em preparo', 'entrou em preparo.'],
  ready: ['canteen-order-ready', 'Pedido pronto', 'está pronto para retirada.'],
  cancelled: ['canteen-order-cancelled', 'Pedido cancelado', 'foi cancelado.'],
} as const;

export class CanteenSalesDetailService {
  constructor(private readonly repository: CanteenSalesRepository, private readonly prisma: TenantPrismaClient, private readonly tenantId: string) {}

  async execute(id: string, input: unknown, actor: string) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';
    const sale = await this.repository.findById(id);
    if (!sale) throw new NotFoundError('Pedido não encontrado.');

    if (action === 'reject') {
      const result = await this.repository.reject(id);
      if (!result) throw new NotFoundError('Pedido não encontrado.');
      await this.notify(result, 'cancelled', actor);
      return parseSale(result);
    }

    if (action === 'status') {
      const orderStatus = body.orderStatus;
      if (orderStatus !== 'preparing' && orderStatus !== 'ready' && orderStatus !== 'cancelled') throw new ValidationError('Status de pedido inválido.');
      const result = await this.repository.updateStatus(id, orderStatus);
      if (!result) throw new NotFoundError('Pedido não encontrado.');
      await this.notify(result, orderStatus, actor);
      return parseSale(result);
    }

    if (action === 'archive') {
      if (sale.orderStatus !== 'ready') throw new ValidationError('Somente pedidos prontos podem ser retirados da fila.');
      const result = await this.repository.archive(id);
      if (!result) throw new NotFoundError('Pedido não encontrado.');
      return parseSale(result);
    }

    if (action === 'approve') {
      const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : '';
      if (!paymentMethod || paymentMethod === 'pending') throw new ValidationError('Forma de pagamento inválida.');
      const result = await this.repository.approve(id, paymentMethod, actor);
      if (!result) throw new NotFoundError('Pedido não encontrado.');
      await this.notify(result, 'approved', actor);
      if (paymentMethod === 'fiado' && result.memberId) {
        await notifyMemberCreditUpdate(this.prisma, this.tenantId, {
          memberId: result.memberId,
          type: 'canteen-credit-debit',
          title: 'Nova cobrança na cantina',
          message: `Foi lançada uma cobrança de R$ ${result.total.toFixed(2)} no seu saldo da cantina.`,
          sender: { name: actor },
          sourceId: result.id,
        });
      }
      return parseSale(result);
    }

    throw new ValidationError('Ação inválida.');
  }

  private async notify(sale: Awaited<ReturnType<CanteenSalesRepository['findById']>>, status: 'approved' | 'preparing' | 'ready' | 'cancelled', actor: string) {
    if (!sale) return;
    const notification = status === 'approved'
      ? ['canteen-order-approved', 'Pedido aprovado', 'foi aprovado e está em preparo.'] as const
      : STATUS_NOTIFICATIONS[status];
    await notifyMemberOrderUpdate(this.prisma, this.tenantId, {
      saleId: sale.id, memberId: sale.memberId, type: notification[0], title: notification[1],
      message: `Seu pedido #${sale.id.slice(-4)} ${notification[2]}`,
      sender: { name: actor },
    });
  }
}
