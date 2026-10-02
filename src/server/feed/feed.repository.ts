import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { canManageGroup, parseJsonField, type FeedVisibility } from '@/lib/groups';
import { generateId } from '@/lib/id';

export type FeedCreateData = {
  id: string; userId: string; userName: string; userAvatar: string | null; senderType: 'user' | 'group'; senderGroupId: string | null;
  type: string; title: string | null; content: string; reference: string | null; mediaUrl: string | null; mediaType: string | null;
  visibility: FeedVisibility; groupId: string | null; pinnedUntil: string | null; targetUserIds: string[];
  mentions?: Array<{ id: string; name: string; handle: string }>;
};

export class FeedRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  accessibleGroupIds(memberId: string | null | undefined) {
    if (!memberId) return Promise.resolve([] as string[]);
    return this.prisma.$queryRawUnsafe<Array<{ groupId: string }>>(`SELECT groupId FROM "GroupMember" WHERE memberId = ? AND deletedAt IS NULL`, memberId).then((rows) => Array.from(new Set(rows.map((row) => row.groupId))));
  }

  async list() {
    return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT id, userId, userName, userAvatar, senderType, senderGroupId, type, title, content, reference, mediaUrl, mediaType, visibility, groupId, pinnedUntil, targetUserIds, readBy, likes, comments, mentions, createdAt, updatedAt
      FROM "FeedPost" WHERE deletedAt IS NULL ORDER BY createdAt DESC, id DESC
    `);
  }

  async findById(id: string) {
    const [post] = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT id, userId, userName, userAvatar, senderType, senderGroupId, type, title, content, reference, mediaUrl, mediaType, visibility, groupId, pinnedUntil, targetUserIds, readBy, likes, comments, mentions, createdAt, updatedAt, deletedAt
      FROM "FeedPost" WHERE id = ? LIMIT 1
    `, id);
    return post ?? null;
  }

  async findGroup(id: string) {
    const [group] = await this.prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(`SELECT id, name FROM "Group" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, id);
    return group ?? null;
  }

  async findUserAvatars(emails: string[]) {
    const normalized = Array.from(new Set(emails.map((value) => value.trim().toLowerCase()).filter(Boolean)));
    if (!normalized.length) return new Map<string, string>();
    const placeholders = normalized.map(() => '?').join(',');
    const rows = await this.prisma.$queryRawUnsafe<Array<{ email: string; avatarUrl: string | null }>>(
      `SELECT lower(email) AS email, avatarUrl FROM "User" WHERE lower(email) IN (${placeholders}) AND active = 1 AND deletedAt IS NULL`,
      ...normalized,
    );
    return new Map(rows.filter((row) => row.avatarUrl).map((row) => [row.email, row.avatarUrl as string]));
  }

  canManageGroup(role: string | null | undefined, memberId: string | null | undefined, groupId: string) {
    return canManageGroup(this.prisma, role, memberId, groupId);
  }

  async findMentionTargets(handles: string[]) {
    if (!handles.length) return [] as Array<{ id: string; name: string; email: string; handle: string }>;
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: string; name: string; email: string }>>(`
      SELECT m.id, m.name, COALESCE(u.email, m.email) AS email
      FROM "Member" m LEFT JOIN "User" u ON (u.linkedMemberId = m.id OR lower(u.email) = lower(m.email))
      WHERE m.active = 1 AND m.approved = 1 AND m.deletedAt IS NULL AND u.active = 1 AND u.deletedAt IS NULL
    `);
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const wanted = new Set(handles.map(normalize));
    return rows
      .map((row) => {
        const fullName = normalize(row.name);
        const firstName = normalize(row.name.split(/\s+/)[0]);
        const matchedHandle = handles.find((handle) => {
          const normalizedHandle = normalize(handle);
          return normalizedHandle === fullName || normalizedHandle === firstName;
        });
        return matchedHandle ? { ...row, handle: matchedHandle } : null;
      })
      .filter((row): row is { id: string; name: string; email: string; handle: string } => Boolean(row));
  }

  async create(data: FeedCreateData) {
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO "FeedPost" (id, userId, userName, userAvatar, senderType, senderGroupId, type, title, content, reference, mediaUrl, mediaType, visibility, groupId, pinnedUntil, targetUserIds, readBy, likes, comments, mentions, createdAt, updatedAt, deletedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, data.id, data.userId, data.userName, data.userAvatar, data.senderType, data.senderGroupId, data.type, data.title, data.content, data.reference, data.mediaUrl, data.mediaType, data.visibility, data.groupId, data.pinnedUntil, data.visibility === 'individual' ? JSON.stringify(data.targetUserIds) : null, '[]', '[]', '[]', JSON.stringify(data.mentions ?? []), now, now, null);
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
      mentions: parseJsonField(typeof post.mentions === 'string' ? post.mentions : null, []),
      targetUserIds: parseJsonField<string[]>(typeof post.targetUserIds === 'string' ? post.targetUserIds : null, []),
      readBy: parseJsonField<string[]>(typeof post.readBy === 'string' ? post.readBy : null, []),
      createdAt: new Date(String(post.createdAt)).toISOString(),
      updatedAt: new Date(String(post.updatedAt)).toISOString(),
    };
  }

  static generateId() { return generateId(); }
}
