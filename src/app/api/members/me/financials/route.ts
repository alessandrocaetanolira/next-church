import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { UnauthenticatedError } from '@/lib/http/errors';
import { jsonError, jsonOk } from '@/lib/http/response';
import { getOwnMemberWallet } from '@/server/member-wallet/member-wallet.controller';
import { MemberWalletRepository } from '@/server/member-wallet/member-wallet.repository';
import { MemberWalletService } from '@/server/member-wallet/member-wallet.service';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) throw new UnauthenticatedError();
    const service = new MemberWalletService(new MemberWalletRepository(getTenantClient(session.user.tenantId)));
    const ledgerCursor = new URL(request.url).searchParams.get('ledgerCursor');
    return jsonOk(await getOwnMemberWallet(session.user, service, ledgerCursor));
  } catch (error) {
    return jsonError(error);
  }
}
