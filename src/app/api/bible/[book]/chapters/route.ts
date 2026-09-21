import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { listBibleChapters } from '@/server/bible/bible.controller';
import { BibleRepository } from '@/server/bible/bible.repository';
import { BibleService } from '@/server/bible/bible.service';

export async function GET(_request: Request, { params }: { params: Promise<{ book: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) throw new UnauthenticatedError();
    const prisma = getTenantClient(session.user.tenantId);
    await ensureTenantSchemaExtensions(prisma);
    const service = new BibleService(new BibleRepository(prisma));
    return jsonOk(await listBibleChapters(session.user, service, (await params).book));
  } catch (error) { return jsonError(error); }
}
