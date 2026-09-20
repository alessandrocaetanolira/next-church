import { CanteenOperationPolicy } from './operation.policy';
import { CanteenOperationService } from './operation.service';

export function getCanteenStatus(user: Parameters<typeof CanteenOperationPolicy.assertView>[0], service: CanteenOperationService) {
  CanteenOperationPolicy.assertView(user);
  return service.getStatus();
}

export function setCanteenStatus(
  user: Parameters<typeof CanteenOperationPolicy.assertOperate>[0],
  service: CanteenOperationService,
  input: unknown,
  updatedBy: string | null,
) {
  CanteenOperationPolicy.assertOperate(user);
  return service.setStatus(input, updatedBy);
}
