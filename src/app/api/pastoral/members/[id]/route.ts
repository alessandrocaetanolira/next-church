import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError, ValidationError } from '@/lib/http/errors';
import { approveMember, rejectMember } from '@/server/pastoral/pastoral.controller';
import { PastoralRepository } from '@/server/pastoral/pastoral.repository';
import { PastoralService } from '@/server/pastoral/pastoral.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const repository = new PastoralRepository(prisma);
  return { user: session.user, service: new PastoralService(repository) };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    const body = await request.json();
    const id = (await params).id;
    if (body?.action === 'approve') return jsonOk(await approveMember(context.user, context.service, id));
    if (body?.action === 'reject') return jsonOk(await rejectMember(context.user, context.service, id));
    throw new ValidationError('Ação inválida.');
  } catch (error) { return jsonError(error); }
}
