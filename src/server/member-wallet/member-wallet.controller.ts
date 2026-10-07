import { MemberWalletPolicy } from './member-wallet.policy';
import { MemberWalletService } from './member-wallet.service';

type WalletUser = Parameters<typeof MemberWalletPolicy.assertViewOwn>[0];

export function getOwnMemberWallet(user: WalletUser, service: MemberWalletService, ledgerCursor?: string | null) {
  MemberWalletPolicy.assertViewOwn(user);
  return service.getOwnWallet(user, ledgerCursor);
}
