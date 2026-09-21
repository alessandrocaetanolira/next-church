import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { listBibleBooks } from '@/server/bible/bible.controller';
import { BibleRepository } from '@/server/bible/bible.repository';
import { BibleService } from '@/server/bible/bible.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { user: session.user, service: new BibleService(new BibleRepository(prisma)) };
}

export async function GET() {
  try { const context = await getContext(); return jsonOk(await listBibleBooks(context.user, context.service)); }
  catch (error) { return jsonError(error); }
}
