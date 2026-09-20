import { CanteenSalesDetailPolicy } from './sales-detail.policy';
import { CanteenSalesDetailService } from './sales-detail.service';

export function operateSale(user: Parameters<typeof CanteenSalesDetailPolicy.assertOperate>[0], service: CanteenSalesDetailService, id: string, input: unknown, actor: string) {
  CanteenSalesDetailPolicy.assertOperate(user);
  return service.execute(id, input, actor);
}
