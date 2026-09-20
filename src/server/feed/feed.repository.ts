import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { canManageGroup, parseJsonField, type FeedVisibility } from '@/lib/groups';
import { generateId } from '@/lib/id';

export type FeedCreateData = {
  id: string; userId: string; userName: string; userAvatar: string | null; senderType: 'user' | 'group'; senderGroupId: string | null;
  type: string; title: string | null; content: string; reference: string | null; mediaUrl: string | null; mediaType: string | null;
  visibility: FeedVisibility; groupId: string | null; pinnedUntil: string | null; targetUserIds: string[];
};

export class FeedRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  accessibleGroupIds(memberId: string | null | undefined) {
    if (!memberId) return Promise.resolve([] as string[]);
    return this.prisma.$queryRawUnsafe<Array<{ groupId: string }>>(`SELECT groupId FROM "GroupMember" WHERE memberId = ? AND deletedAt IS NULL`, memberId).then((rows) => Array.from(new Set(rows.map((row) => row.groupId))));
  }

  async list() {
    return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT id, userId, userName, userAvatar, senderType, senderGroupId, type, title, content, reference, mediaUrl, mediaType, visibility, groupId, pinnedUntil, targetUserIds, readBy, likes, comments, createdAt, updatedAt
      FROM "FeedPost" WHERE deletedAt IS NULL ORDER BY createdAt DESC, id DESC
    `);
  }

  async findById(id: string) {
    const [post] = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT id, userId, userName, userAvatar, senderType, senderGroupId, type, title, content, reference, mediaUrl, mediaType, visibility, groupId, pinnedUntil, targetUserIds, readBy, likes, comments, createdAt, updatedAt, deletedAt
      FROM "FeedPost" WHERE id = ? LIMIT 1
    `, id);
    return post ?? null;
  }

  async findGroup(id: string) {
    const [group] = await this.prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(`SELECT id, name FROM "Group" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, id);
    return group ?? null;
  }

  canManageGroup(role: string | null | undefined, memberId: string | null | undefined, groupId: string) {
    return canManageGroup(this.prisma, role, memberId, groupId);
  }

  async create(data: FeedCreateData) {
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO "FeedPost" (id, userId, userName, userAvatar, senderType, senderGroupId, type, title, content, reference, mediaUrl, mediaType, visibility, groupId, pinnedUntil, targetUserIds, readBy, likes, comments, createdAt, updatedAt, deletedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, data.id, data.userId, data.userName, data.userAvatar, data.senderType, data.senderGroupId, data.type, data.title, data.content, data.reference, data.mediaUrl, data.mediaType, data.visibility, data.groupId, data.pinnedUntil, data.visibility === 'individual' ? JSON.stringify(data.targetUserIds) : null, '[]', '[]', now, now, null);
    return this.findById(data.id);
  }

  async updateEngagement(id: string, likes: string[], comments: unknown[]) {
    await this.prisma.$executeRawUnsafe(`UPDATE "FeedPost" SET likes = ?, comments = ?, updatedAt = ? WHERE id = ?`, JSON.stringify(likes), JSON.stringify(comments), new Date().toISOString(), id);
    return this.findById(id);
  }

  async softDelete(id: string) {
    await this.prisma.$executeRawUnsafe(`UPDATE "FeedPost" SET deletedAt = ?, updatedAt = ? WHERE id = ?`, new Date().toISOString(), new Date().toISOString(), id);
    return { success: true };
  }

  static serialize(post: Record<string, unknown>) {
    return {
      ...post,
      likes: parseJsonField<string[]>(typeof post.likes === 'string' ? post.likes : null, []),
      comments: parseJsonField(typeof post.comments === 'string' ? post.comments : null, []),
      targetUserIds: parseJsonField<string[]>(typeof post.targetUserIds === 'string' ? post.targetUserIds : null, []),
      readBy: parseJsonField<string[]>(typeof post.readBy === 'string' ? post.readBy : null, []),
      createdAt: new Date(String(post.createdAt)).toISOString(),
      updatedAt: new Date(String(post.updatedAt)).toISOString(),
    };
  }

  static generateId() { return generateId(); }
}
