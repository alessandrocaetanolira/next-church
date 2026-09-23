import { auth } from '@/auth';
import { getBibleClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { listBibleBooks } from '@/server/bible/bible.controller';
import { BibleRepository } from '@/server/bible/bible.repository';
import { BibleService } from '@/server/bible/bible.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getBibleClient();
  return { user: session.user, service: new BibleService(new BibleRepository(prisma)) };
}

export async function GET(request: Request) {
  try {
    const context = await getContext();
    return jsonOk(await listBibleBooks(context.user, context.service, new URL(request.url).searchParams.get('translation') ?? undefined));
  }
  catch (error) { return jsonError(error); }
}
