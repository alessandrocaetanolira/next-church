import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { registerPayment } from '@/server/canteen/ledger.controller';
import { CanteenLedgerRepository } from '@/server/canteen/ledger.repository';
import { CanteenLedgerService } from '@/server/canteen/ledger.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { session, service: new CanteenLedgerService(new CanteenLedgerRepository(prisma)) };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    const user = context.session.user;
    return jsonOk(await registerPayment(user, context.service, (await params).id, await request.json(), user.name ?? user.email ?? 'Sistema'));
  } catch (error) { return jsonError(error); }
}
