import { CanteenSalesPolicy } from './sales.policy';
import { CanteenSalesService } from './sales.service';

type ControllerContext = { user: Parameters<typeof CanteenSalesPolicy.assertView>[0]; service: CanteenSalesService };

export function listSales({ user, service }: ControllerContext) { CanteenSalesPolicy.assertView(user); return service.list(); }
export function createSale({ user, service }: ControllerContext, input: unknown) { CanteenSalesPolicy.assertCreate(user); return service.create(input, user ?? {}); }
