import { hasPlanFeature } from '@/lib/access-control';
import { ForbiddenError, UnauthenticatedError, ValidationError } from '@/lib/http/errors';
import { getTenantClient } from '@/lib/prisma-factory';
import { SyncPullRepository } from './sync-pull.repository';
import { SyncPullService, type SyncUser } from './sync-pull.service';

/** Autoriza e valida antes de compor acesso ao banco do tenant. */
export function pullSync(user: SyncUser | null | undefined, lastSync: string | null) {
  if (!user?.tenantId || (!user.email && !user.id)) throw new UnauthenticatedError();
  if (!hasPlanFeature(user, 'offline_sync')) throw new ForbiddenError('Recurso não disponível no plano.');
  const since = lastSync ? new Date(lastSync) : new Date(0);
  if (Number.isNaN(since.getTime()) || since.getTime() < 0 || since.getTime() > Date.now()) {
    throw new ValidationError('Cursor de sincronização inválido.');
  }
  return new SyncPullService(new SyncPullRepository(getTenantClient(user.tenantId))).pull(user, since);
}
