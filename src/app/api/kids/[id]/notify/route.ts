import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { notifyKid } from '@/server/kids/kids.controller';
import { KidsRepository } from '@/server/kids/kids.repository';
import { KidsService } from '@/server/kids/kids.service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) throw new UnauthenticatedError();
    const prisma = getTenantClient(session.user.tenantId);
    await ensureTenantSchemaExtensions(prisma);
    const service = new KidsService(new KidsRepository(prisma), prisma, session.user.tenantId);
    return jsonOk(await notifyKid(session.user, service, (await params).id, await request.json(), session.user.name || 'Equipe'));
  } catch (error) { return jsonError(error); }
}
