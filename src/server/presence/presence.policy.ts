import { canViewMemberPresence } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PresenceUser = Parameters<typeof canViewMemberPresence>[0];

export class PresencePolicy {
  static canView(user: PresenceUser | null | undefined) {
    return canViewMemberPresence(user);
  }

  static assertView(user: PresenceUser | null | undefined) {
    if (!this.canView(user)) throw new ForbiddenError('Sem permissão para ver membros online.');
  }
}
