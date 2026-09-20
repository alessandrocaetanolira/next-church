import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createFeedPost, listFeed } from '@/server/feed/feed.controller';
import { FeedRepository } from '@/server/feed/feed.repository';
import { FeedService } from '@/server/feed/feed.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const repository = new FeedRepository(prisma);
  return { session, repository, service: new FeedService(repository, prisma, session.user.tenantId) };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getContext();
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? '1'));
    const limit = Math.min(20, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? '10')));
    return jsonOk(await listFeed({ user: context.session.user, repository: context.repository, service: context.service }, {
      page, limit, type: request.nextUrl.searchParams.get('type'), groupId: request.nextUrl.searchParams.get('groupId'),
    }));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getContext();
    return jsonOk(await createFeedPost({ user: context.session.user, repository: context.repository, service: context.service }, await request.json()), 201);
  } catch (error) { return jsonError(error); }
}
