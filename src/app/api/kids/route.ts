import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createKid, listKids } from '@/server/kids/kids.controller';
import { KidsRepository } from '@/server/kids/kids.repository';
import { KidsService } from '@/server/kids/kids.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return { user: session.user, service: new KidsService(new KidsRepository(prisma), prisma, session.user.tenantId) };
}

export async function GET() {
  try { const context = await getContext(); return jsonOk(await listKids(context.user, context.service)); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try { const context = await getContext(); return jsonOk(await createKid(context.user, context.service, await request.json()), 201); }
  catch (error) { return jsonError(error); }
}
