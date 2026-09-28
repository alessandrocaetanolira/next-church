import { ValidationError } from '@/lib/http/errors';
import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { notifyCanteenOpened } from '@/lib/server/notification-service';
import { CanteenOperationRepository } from './operation.repository';

export class CanteenOperationService {
  constructor(
    private readonly repository: CanteenOperationRepository,
    private readonly prisma: TenantPrismaClient,
    private readonly tenantId: string,
  ) {}

  getStatus() { return this.repository.getStatus(); }

  async setStatus(input: unknown, updatedBy: string | null) {
    const body = (input && typeof input === 'object' ? input : {}) as { isOpen?: unknown };
    if (typeof body.isOpen !== 'boolean') throw new ValidationError('Informe isOpen como booleano.');
    const current = await this.repository.getStatus();
    const status = await this.repository.setStatus(body.isOpen, updatedBy);

    if (!current.isOpen && status.isOpen) {
      await notifyCanteenOpened(this.prisma, this.tenantId, { email: updatedBy });
    }

    return status;
  }
}
