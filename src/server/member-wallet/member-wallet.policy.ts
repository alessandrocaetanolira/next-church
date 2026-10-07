import { ForbiddenError } from '@/lib/http/errors';

type WalletUser = { tenantId?: string | null; email?: string | null; linkedMemberId?: string | null };

/** Permite a leitura da própria carteira, sem ampliar members:view. */
export class MemberWalletPolicy {
  static assertViewOwn(user: WalletUser) {
    if (!user.tenantId || (!user.linkedMemberId && !user.email)) {
      throw new ForbiddenError('Sua conta não está vinculada a um membro para consultar a carteira.');
    }
  }
}
