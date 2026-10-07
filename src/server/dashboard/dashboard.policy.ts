import { hasAnyActionPermission } from '@/lib/access-control';

type PolicyUser = Parameters<typeof hasAnyActionPermission>[0];

/**
 * O dashboard é composto por blocos independentes. A ausência de acesso a um
 * módulo não invalida a página inteira: apenas omite o respectivo bloco.
 */
export class DashboardPolicy {
  static canViewTasks(user: PolicyUser) {
    return hasAnyActionPermission(user, 'tasks', ['view']);
  }

  static canViewCanteen(user: PolicyUser) {
    return hasAnyActionPermission(user, 'canteen', ['view', 'operate', 'sell', 'manage', 'manage_products']);
  }
}
