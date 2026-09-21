import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { getBibleChapter } from '@/server/bible/bible.controller';
import { BibleRepository } from '@/server/bible/bible.repository';
import { BibleService } from '@/server/bible/bible.service';

export async function GET(_request: Request, { params }: { params: Promise<{ book: string; chapter: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) throw new UnauthenticatedError();
    const prisma = getTenantClient(session.user.tenantId);
    await ensureTenantSchemaExtensions(prisma);
    const service = new BibleService(new BibleRepository(prisma));
    const values = await params;
    return jsonOk(await getBibleChapter(session.user, service, values.book, values.chapter));
  } catch (error) { return jsonError(error); }
}
