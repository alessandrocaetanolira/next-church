import { notifyCanteenNewOrder } from '@/lib/server/notification-service';
import { ValidationError, ConflictError } from '@/lib/http/errors';
import { ForbiddenError } from '@/lib/http/errors';
import { hasActionPermission } from '@/lib/access-control';
import { generateId } from '@/lib/id';
import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { getCanteenStatus } from '@/lib/server/canteen-operation';
import { CanteenSalesRepository, type SaleItem } from './sales.repository';

type User = { email?: string | null; name?: string | null; role?: string | null; permissions?: string[] | string | null; planFeatures?: string[] | string | null };

export class CanteenSalesService {
  constructor(
    private readonly repository: CanteenSalesRepository,
    private readonly prisma: TenantPrismaClient,
    private readonly tenantId: string,
  ) {}

  list() { return this.repository.list(); }

  async create(input: unknown, user: User) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const items = Array.isArray(body.items) ? body.items : [];
    const total = Number(body.total);
    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : '';
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

    const status = await getCanteenStatus(this.prisma);
    if (!status.isOpen) throw new ConflictError('A cantina está fechada no momento.');

    const canSell = hasActionPermission(user, 'canteen', 'sell');
    if (!canSell && (paymentMethod !== 'pending' || orderStatus !== 'pending')) {
      throw new ForbiddenError('Membros devem enviar pedidos para aprovação da cantina.');
    }

    const result = await this.repository.create({
      id: typeof body.id === 'string' && body.id ? body.id : undefined,
      total,
      paymentMethod,
      orderStatus,
      items: normalizedItems,
      memberId: typeof body.memberId === 'string' ? body.memberId : null,
      memberName: typeof body.memberName === 'string' ? body.memberName : null,
      createdBy: typeof body.createdBy === 'string' && body.createdBy ? body.createdBy : user.name ?? user.email ?? 'Sistema',
      createdAt: typeof body.createdAt === 'string' ? new Date(body.createdAt) : undefined,
    });

    if (paymentMethod === 'pending') {
      await notifyCanteenNewOrder(this.prisma, this.tenantId, { id: result.id, memberName: result.memberName, total: result.total });
    }
    return result;
  }
}
