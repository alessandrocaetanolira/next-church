import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

function assertOperatorRole(user: PolicyUser) {
  if (!['ADMIN', 'PASTOR', 'CANTEEN'].includes(user?.role?.toUpperCase() ?? '')) {
    throw new ForbiddenError('Apenas operadores da cantina podem acessar o fiado.');
  }
}

export class CanteenLedgerPolicy {
  static assertView(user: PolicyUser) {
    assertOperatorRole(user);
    if (!hasActionPermission(user, 'canteen', 'view')) throw new ForbiddenError('Sem permissão para consultar o fiado.');
  }

  static assertPayment(user: PolicyUser) {
    assertOperatorRole(user);
    if (!hasActionPermission(user, 'canteen', 'operate')) throw new ForbiddenError('Sem permissão para registrar pagamentos.');
  }
}
