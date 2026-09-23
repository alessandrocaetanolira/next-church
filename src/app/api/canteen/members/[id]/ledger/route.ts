import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { getLedger } from '@/server/canteen/ledger.controller';
import { CanteenLedgerRepository } from '@/server/canteen/ledger.repository';
import { CanteenLedgerService } from '@/server/canteen/ledger.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return { session, service: new CanteenLedgerService(new CanteenLedgerRepository(prisma)) };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    return jsonOk(await getLedger(context.session.user, context.service, (await params).id));
  } catch (error) { return jsonError(error); }
}
