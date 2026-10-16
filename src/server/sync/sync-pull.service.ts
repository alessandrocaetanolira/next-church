import { hasActionPermission } from '@/lib/access-control';
import { getCanteenAccess } from '@/lib/canteen/access';
import { parseSale } from '@/server/canteen/sales.repository';
import { SyncPullRepository } from './sync-pull.repository';

export type SyncUser = NonNullable<Parameters<typeof hasActionPermission>[0]> & { id?: string };

/** Ter offline_sync não concede acesso aos dados: cada módulo tem seu próprio escopo. */
export class SyncPullService {
  constructor(private readonly repository: SyncPullRepository) {}

  async pull(user: SyncUser, since: Date) {
    // Cursor anterior às consultas: alterações posteriores entram no próximo pull.
    const until = new Date();
    const canteen = getCanteenAccess(user);
    const canOperateSales = canteen.canViewSales;
    const canReadMembers = hasActionPermission(user, 'members', 'view') || canteen.canSell || canteen.canOperate;
    const ownMemberId = user.linkedMemberId || null;
    const canReadOwnMember = Boolean(ownMemberId) && canteen.canBrowse;
    const withBalance = canteen.canSell || canteen.canOperate || (!canReadMembers && canReadOwnMember);
    const canReadTasks = hasActionPermission(user, 'tasks', 'view');
    const globalTasks = ['ADMIN', 'PASTOR'].includes(user.role?.toUpperCase() ?? '');
    const teamIds = canReadTasks && !globalTasks && ownMemberId
      ? await this.repository.memberTeamIds(ownMemberId) : [];

    const [sales, products, members, tasks] = await Promise.all([
      canOperateSales || (canteen.canOrder && ownMemberId)
        ? this.repository.sales(since, until, canOperateSales ? undefined : ownMemberId!) : [],
      canteen.canBrowse || canteen.canSell || canteen.canManageProducts
        ? this.repository.products(since, until, canteen.canManageProducts || canteen.canSell) : [],
      canReadMembers || canReadOwnMember
        ? this.repository.members(since, until, canReadMembers ? null : ownMemberId, withBalance) : [],
      canReadTasks && (globalTasks || teamIds.length > 0)
        ? this.repository.tasks(since, until, globalTasks ? undefined : teamIds) : [],
    ]);

    return { sales: sales.map(parseSale), products, members, tasks, timestamp: until.toISOString() };
  }
}
