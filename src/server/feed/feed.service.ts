import { NotFoundError, ValidationError } from '@/lib/http/errors';
import { notifyAnnouncementPublished, notifyFeedComment, notifyFeedLike, notifyGroupFeedPublished } from '@/lib/server/notification-service';
import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { FeedRepository } from './feed.repository';

type FeedUser = { email?: string | null; name?: string | null; image?: string | null; role?: string | null; linkedMemberId?: string | null };

export class FeedService {
  constructor(private readonly repository: FeedRepository, private readonly prisma: TenantPrismaClient, private readonly tenantId: string) {}

  async list(email: string, groupIds: string[], page: number, limit: number, type: string | null, groupIdFilter: string | null) {
    const rows = await this.repository.list();
    const visible = rows.filter((post) => {
      if (type && type !== 'all' && post.type !== type) return false;
      if (groupIdFilter && post.groupId !== groupIdFilter) return false;
      const visibility = String(post.visibility ?? 'public');
      if (visibility === 'public') return true;
      if (visibility === 'group') return typeof post.groupId === 'string' && groupIds.includes(post.groupId);
      if (visibility === 'individual') return FeedRepository.serialize(post).targetUserIds.includes(email);
      return true;
    });
    const now = Date.now();
    visible.sort((left, right) => {
      const leftPinned = left.pinnedUntil ? new Date(String(left.pinnedUntil)).getTime() > now : false;
      const rightPinned = right.pinnedUntil ? new Date(String(right.pinnedUntil)).getTime() > now : false;
      if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
      return new Date(String(right.createdAt)).getTime() - new Date(String(left.createdAt)).getTime();
    });
    const skip = (page - 1) * limit;
    const items = visible.slice(skip, skip + limit).map(FeedRepository.serialize);
    return { items, hasMore: skip + items.length < visible.length, page };
  }

  async create(user: FeedUser, input: unknown) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const content = String(body.content ?? '').trim();
    if (!content) throw new ValidationError('Conteúdo obrigatório.');
    const type = typeof body.type === 'string' && body.type.trim() ? body.type.trim() : 'testimony';
    const role = user.role?.toUpperCase() ?? 'MEMBER';
    const canTargetFeed = ['ADMIN', 'PASTOR'].includes(role);
    const visibility = String(body.visibility ?? 'public') as 'public' | 'group' | 'individual';
    const postAsGroup = body.postAsGroup === true;
    const groupId = typeof body.groupId === 'string' && body.groupId.trim() ? body.groupId.trim() : null;
    const group = groupId ? await this.repository.findGroup(groupId) : null;
    if (postAsGroup && !groupId) throw new ValidationError('Grupo obrigatório para publicação em nome do grupo.');
    if (postAsGroup && !group) throw new ValidationError('Grupo não encontrado.');
    const effectiveVisibility = postAsGroup ? 'group' : (canTargetFeed ? visibility : 'public');
    const id = FeedRepository.generateId();
    const pinDays = Math.max(0, Math.min(30, Number(body.pinDays ?? 0)));
    const post = await this.repository.create({
      id, userId: user.email as string, userName: postAsGroup ? group?.name ?? 'Grupo' : user.name || 'Usuário', userAvatar: postAsGroup ? null : user.image || null,
      senderType: postAsGroup ? 'group' : 'user', senderGroupId: postAsGroup ? groupId : null, type,
      title: typeof body.title === 'string' ? body.title.trim() || null : null, content,
      reference: typeof body.reference === 'string' ? body.reference.trim() || null : null,
      mediaUrl: typeof body.mediaUrl === 'string' ? body.mediaUrl.trim() || null : null,
      mediaType: body.mediaType === 'video' || body.mediaType === 'image' ? body.mediaType : null,
      visibility: effectiveVisibility, groupId: effectiveVisibility === 'group' ? groupId : null,
      pinnedUntil: pinDays > 0 ? new Date(Date.now() + pinDays * 86400000).toISOString() : null,
      targetUserIds: canTargetFeed && visibility === 'individual' && Array.isArray(body.targetUserIds) ? body.targetUserIds.filter((item): item is string => typeof item === 'string') : [],
    });
    if (type === 'announcement') await notifyAnnouncementPublished(this.prisma, this.tenantId, { postId: id, actorEmail: user.email as string, actorName: user.name || 'Usuário', title: typeof body.title === 'string' ? body.title : null, content, visibility: effectiveVisibility, groupId, targetUserIds: [], notifyResponsibles: false });
    else if (postAsGroup && group) await notifyGroupFeedPublished(this.prisma, this.tenantId, { postId: id, actorEmail: user.email as string, groupId: group.id, groupName: group.name, title: typeof body.title === 'string' ? body.title : null, content });
    return post ? FeedRepository.serialize(post) : null;
  }

  async toggleLike(id: string, actorEmail: string, actorName: string) {
    const post = await this.repository.findById(id);
    if (!post || post.deletedAt) throw new NotFoundError('Publicação não encontrada.');
    const likes = FeedRepository.serialize(post).likes as string[];
    const wasLiked = likes.includes(actorEmail);
    const nextLikes = wasLiked ? likes.filter((email) => email !== actorEmail) : [...likes, actorEmail];
    const updated = await this.repository.updateEngagement(id, nextLikes, FeedRepository.serialize(post).comments as unknown[]);
    if (!wasLiked) await notifyFeedLike(this.prisma, this.tenantId, { postId: id, actorEmail, actorName });
    return updated ? FeedRepository.serialize(updated) : null;
  }

  async addComment(id: string, actorEmail: string, actorName: string, input: unknown) {
    const content = input && typeof input === 'object' && typeof (input as { content?: unknown }).content === 'string'
      ? (input as { content: string }).content.trim()
      : '';
    if (!content) throw new ValidationError('Comentário obrigatório.');
    const post = await this.repository.findById(id);
    if (!post || post.deletedAt) throw new NotFoundError('Publicação não encontrada.');
    const serialized = FeedRepository.serialize(post);
    const comment = { id: FeedRepository.generateId(), userId: actorEmail, userName: actorName, content, createdAt: new Date().toISOString() };
    const updated = await this.repository.updateEngagement(id, serialized.likes as string[], [...serialized.comments as unknown[], comment]);
    await notifyFeedComment(this.prisma, this.tenantId, { postId: id, actorEmail, actorName, content });
    return updated ? FeedRepository.serialize(updated) : null;
  }

  async remove(id: string) {
    const post = await this.repository.findById(id);
    if (!post || post.deletedAt) throw new NotFoundError('Publicação não encontrada.');
    return this.repository.softDelete(id);
  }
}
