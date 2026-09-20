import { CanteenLedgerPolicy } from './ledger.policy';
import { CanteenLedgerService } from './ledger.service';

export function getLedger(user: Parameters<typeof CanteenLedgerPolicy.assertView>[0], service: CanteenLedgerService, memberId: string) {
  CanteenLedgerPolicy.assertView(user);
  return service.get(memberId);
}

export function registerPayment(user: Parameters<typeof CanteenLedgerPolicy.assertPayment>[0], service: CanteenLedgerService, memberId: string, input: unknown, createdBy: string) {
  CanteenLedgerPolicy.assertPayment(user);
  return service.payment(memberId, input, createdBy);
}
