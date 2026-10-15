import { CanteenOperationPolicy } from './operation.policy';
import { CanteenOperationService } from './operation.service';
import { CanteenOperationRepository } from './operation.repository';
import { getTenantClient } from '@/lib/prisma-factory';
import { UnauthenticatedError } from '@/lib/http/errors';

type OperationUser = NonNullable<Parameters<typeof CanteenOperationPolicy.assertView>[0]> & { name?: string | null };

/** Mantém autenticação/autorização e composição fora da rota HTTP. */
export function getOperationContext(user: OperationUser | null | undefined, action: 'view' | 'operate') {
  if (!user?.tenantId) throw new UnauthenticatedError();
  if (action === 'view') CanteenOperationPolicy.assertView(user);
  else CanteenOperationPolicy.assertOperate(user);
  const prisma = getTenantClient(user.tenantId);
  return { user, service: new CanteenOperationService(new CanteenOperationRepository(prisma), prisma, user.tenantId) };
}

export function getCanteenStatus(user: Parameters<typeof CanteenOperationPolicy.assertView>[0], service: CanteenOperationService) {
  CanteenOperationPolicy.assertView(user);
  return service.getStatus();
}

export function setCanteenStatus(
  user: Parameters<typeof CanteenOperationPolicy.assertOperate>[0],
  service: CanteenOperationService,
  input: unknown,
  updatedBy: string | null,
) {
  CanteenOperationPolicy.assertOperate(user);
  return service.setStatus(input, updatedBy);
}
