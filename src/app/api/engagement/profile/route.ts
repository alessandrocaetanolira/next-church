import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { getEngagement, updateEngagement } from '@/server/engagement/engagement.controller';
import { EngagementRepository } from '@/server/engagement/engagement.repository';
import { EngagementService } from '@/server/engagement/engagement.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { user: session.user, service: new EngagementService(new EngagementRepository(prisma)) };
}

export async function GET() {
  try { const context = await getContext(); return jsonOk(await getEngagement(context.user, context.service)); }
  catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try { const context = await getContext(); return jsonOk(await updateEngagement(context.user, context.service, await request.json())); }
  catch (error) { return jsonError(error); }
}
