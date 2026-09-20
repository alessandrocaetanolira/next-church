import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';
import type { FeedRepository } from './feed.repository';

type PolicyUser = Parameters<typeof hasActionPermission>[0] & { linkedMemberId?: string | null };

export class FeedPolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'feed', 'view')) throw new ForbiddenError('Sem permissão para consultar o feed.');
  }

  static assertPublish(user: PolicyUser) {
    if (!hasAnyActionPermission(user, 'feed', ['publish', 'create'])) throw new ForbiddenError('Sem permissão para publicar no feed.');
  }

  static assertShare(user: PolicyUser) {
    if (!hasActionPermission(user, 'feed', 'share')) throw new ForbiddenError('Sem permissão para compartilhar no feed.');
  }

  static assertModerate(user: PolicyUser) {
    if (!hasActionPermission(user, 'feed', 'moderate')) throw new ForbiddenError('Sem permissão para moderar o feed.');
  }

  static async assertGroupPublish(user: PolicyUser, repository: FeedRepository, groupId: string) {
    if (!(await repository.canManageGroup(user.role, user.linkedMemberId, groupId))) throw new ForbiddenError('Sem permissão para publicar em nome do grupo.');
  }

  static assertComment(user: PolicyUser) {
    if (!hasActionPermission(user, 'feed', 'comment')) throw new ForbiddenError('Sem permissão para interagir no feed.');
  }

  static assertDelete(user: PolicyUser) {
    if (!['ADMIN', 'PASTOR'].includes(user.role?.toUpperCase() ?? '') || !hasActionPermission(user, 'feed', 'delete')) {
      throw new ForbiddenError('Sem permissão para excluir publicações.');
    }
  }
}
