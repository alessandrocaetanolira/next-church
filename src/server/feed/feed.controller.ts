import { FeedPolicy } from './feed.policy';
import { FeedRepository } from './feed.repository';
import { FeedService } from './feed.service';

type User = Parameters<typeof FeedPolicy.assertView>[0];
type Context = { user: User; repository: FeedRepository; service: FeedService };
const actorName = (user: User) => (user as User & { name?: string | null }).name || 'Usuário';

export async function listFeed({ user, repository, service }: Context, options: { page: number; limit: number; type: string | null; groupId: string | null }) {
  FeedPolicy.assertView(user);
  const groupIds = await repository.accessibleGroupIds(user.linkedMemberId);
  return service.list(user.email as string, groupIds, options.page, options.limit, options.type, options.groupId);
}

export async function createFeedPost({ user, repository, service }: Context, input: unknown) {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const postAsGroup = body.postAsGroup === true;
  const isSharedContent = body.share === true;
  const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : '';
  if (postAsGroup) {
    FeedPolicy.assertShare(user);
    await FeedPolicy.assertGroupPublish(user, repository, groupId);
  } else if (isSharedContent) {
    FeedPolicy.assertShare(user);
  } else if (body.type === 'announcement' || body.visibility !== 'public' || Number(body.pinDays ?? 0) > 0) {
    FeedPolicy.assertModerate(user);
  } else {
    FeedPolicy.assertPublish(user);
  }
  return service.create(user, input);
}

export function toggleFeedLike({ user, service }: Context, id: string) {
  FeedPolicy.assertComment(user);
  return service.toggleLike(id, user.email as string, actorName(user));
}

export function addFeedComment({ user, service }: Context, id: string, input: unknown) {
  FeedPolicy.assertComment(user);
  return service.addComment(id, user.email as string, actorName(user), input);
}

export function deleteFeedPost({ user, service }: Context, id: string) {
  FeedPolicy.assertDelete(user);
  return service.remove(id);
}
