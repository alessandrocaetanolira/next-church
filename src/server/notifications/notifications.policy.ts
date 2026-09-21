import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class NotificationsPolicy {
  static assertView(user: PolicyUser) { if (!hasActionPermission(user, 'notifications', 'view')) throw new ForbiddenError('Sem permissão para consultar notificações.'); }
  static assertUpdate(user: PolicyUser) { if (!hasActionPermission(user, 'notifications', 'update')) throw new ForbiddenError('Sem permissão para atualizar notificações.'); }
}
