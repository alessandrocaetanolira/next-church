import { CanteenSalesPolicy } from './sales.policy';
import { CanteenSalesService } from './sales.service';
import { UnauthenticatedError } from '@/lib/http/errors';
import { getTenantClient } from '@/lib/prisma-factory';
import { CanteenSalesRepository } from './sales.repository';

type ControllerContext = { user: Parameters<typeof CanteenSalesPolicy.assertView>[0]; service: CanteenSalesService };

/** Composição somente depois da autorização, sem expor banco/repository à rota. */
export function getSalesContext(user: ControllerContext['user'], action: 'view' | 'create'): ControllerContext {
  if (!user?.tenantId) throw new UnauthenticatedError();
  if (action === 'view') CanteenSalesPolicy.assertView(user);
  else CanteenSalesPolicy.assertCreate(user);
  const prisma = getTenantClient(user.tenantId);
  return { user, service: new CanteenSalesService(new CanteenSalesRepository(prisma), prisma, user.tenantId) };
}

export function listSales({ user, service }: ControllerContext) { CanteenSalesPolicy.assertView(user); return service.list(); }
export function createSale({ user, service }: ControllerContext, input: unknown) { CanteenSalesPolicy.assertCreate(user); return service.create(input, user ?? {}); }

/** Composição de leitura incremental para o sync; o service decide escopo próprio ou operacional. */
export function pullSalesChanges(user: ControllerContext['user'], since: Date) {
  if (!user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(user.tenantId);
  return new CanteenSalesService(new CanteenSalesRepository(prisma), prisma, user.tenantId).changes(since, user);
}
