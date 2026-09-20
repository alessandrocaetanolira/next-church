import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError, ValidationError } from '@/lib/http/errors';
import { addFeedComment, deleteFeedPost, toggleFeedLike } from '@/server/feed/feed.controller';
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    const body = await request.json();
    const id = (await params).id;
    if (body?.action === 'toggle-like') return jsonOk(await toggleFeedLike({ user: context.session.user, repository: context.repository, service: context.service }, id));
    if (body?.action === 'add-comment') return jsonOk(await addFeedComment({ user: context.session.user, repository: context.repository, service: context.service }, id, body));
    throw new ValidationError('Ação inválida.');
  } catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    return jsonOk(await deleteFeedPost({ user: context.session.user, repository: context.repository, service: context.service }, (await params).id));
  } catch (error) { return jsonError(error); }
}
