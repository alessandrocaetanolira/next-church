import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { notifyAnnouncementPublished, notifyGroupFeedPublished } from '@/lib/server/notification-service';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { canManageGroup, FeedVisibility, getAccessibleGroupIds, normalizeStringArray, parseJsonField } from '@/lib/groups';
import { generateId } from '@/lib/id';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? '1'));
  const limit = Math.min(20, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? '10')));
  const type = request.nextUrl.searchParams.get('type');
  const groupIdFilter = request.nextUrl.searchParams.get('groupId');
  const skip = (page - 1) * limit;

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const groupIds = await getAccessibleGroupIds(prisma, session.user.linkedMemberId);
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, userId, userName, userAvatar, senderType, senderGroupId, type, title, content, reference, mediaUrl, mediaType, visibility, groupId, pinnedUntil, targetUserIds, readBy, likes, comments, createdAt, updatedAt
      FROM "FeedPost"
      WHERE deletedAt IS NULL
        AND (? IS NULL OR ? = 'all' OR type = ?)
      ORDER BY createdAt DESC, id DESC
    `,
    type,
    type,
    type
  );

  const visiblePosts = rows.filter((post) => {
    if (groupIdFilter && post.groupId !== groupIdFilter) return false;
    const visibility = String(post.visibility ?? 'public') as FeedVisibility;
    if (visibility === 'public') return true;
    if (visibility === 'group') {
      const groupId = typeof post.groupId === 'string' ? post.groupId : null;
      return !!groupId && groupIds.includes(groupId);
    }
    if (visibility === 'individual') {
      const targetUserIds = parseJsonField<string[]>(typeof post.targetUserIds === 'string' ? post.targetUserIds : null, []);
      return targetUserIds.includes(session.user.email ?? '');
    }
    return true;
  });

  const now = Date.now();
  const sortedPosts = [...visiblePosts].sort((left, right) => {
    const leftPinnedUntil = left.pinnedUntil ? new Date(String(left.pinnedUntil)).getTime() : 0;
    const rightPinnedUntil = right.pinnedUntil ? new Date(String(right.pinnedUntil)).getTime() : 0;
    const leftPinned = leftPinnedUntil > now;
    const rightPinned = rightPinnedUntil > now;
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
    const leftCreated = new Date(String(left.createdAt)).getTime();
    const rightCreated = new Date(String(right.createdAt)).getTime();
    return rightCreated - leftCreated;
  });

  const items = sortedPosts.slice(skip, skip + limit);

  return NextResponse.json({
    items: items.map((post) => ({
      ...post,
      likes: parseJsonField<string[]>(typeof post.likes === 'string' ? post.likes : null, []),
      comments: parseJsonField(typeof post.comments === 'string' ? post.comments : null, []),
      targetUserIds: parseJsonField<string[]>(typeof post.targetUserIds === 'string' ? post.targetUserIds : null, []),
      readBy: parseJsonField<string[]>(typeof post.readBy === 'string' ? post.readBy : null, []),
      createdAt: new Date(String(post.createdAt)).toISOString(),
      updatedAt: new Date(String(post.updatedAt)).toISOString(),
    })),
    hasMore: skip + items.length < sortedPosts.length,
    page,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const title = typeof body.title === 'string' ? body.title.trim() : null;
  const content = String(body.content ?? '').trim();
  const type = String(body.type ?? 'testimony');
  const reference = typeof body.reference === 'string' ? body.reference.trim() : null;
  const mediaUrl = typeof body.mediaUrl === 'string' ? body.mediaUrl.trim() : null;
  const mediaType = body.mediaType === 'video' ? 'video' : body.mediaType === 'image' ? 'image' : null;
  const visibility = String(body.visibility ?? 'public') as FeedVisibility;
  const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : null;
  const postAsGroup = body.postAsGroup === true;
  const pinDays = Math.max(0, Math.min(30, Number(body.pinDays ?? 0)));
  const targetUserIds = normalizeStringArray(body.targetUserIds);
  const notifyResponsibles = body.notifyResponsibles === true;
  const role = session.user.role?.toUpperCase() ?? 'MEMBER';
  const canTargetFeed = ['ADMIN', 'PASTOR'].includes(role);

  if (!content) {
    return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 });
  }

  if (type === 'announcement' && !['ADMIN', 'PASTOR'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão para publicar avisos' }, { status: 403 });
  }

  if (!canTargetFeed && visibility !== 'public') {
    return NextResponse.json({ error: 'Sem permissão para publicar avisos direcionados' }, { status: 403 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  if (postAsGroup) {
    if (!groupId) {
      return NextResponse.json({ error: 'Grupo obrigatório para publicação em nome do grupo' }, { status: 400 });
    }

    const allowed = await canManageGroup(prisma, session.user.role, session.user.linkedMemberId, groupId);
    if (!allowed) {
      return NextResponse.json({ error: 'Sem permissão para publicar em nome do grupo' }, { status: 403 });
    }
  }

  const [senderGroup] = groupId
    ? await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
        `SELECT id, name FROM "Group" WHERE id = ? AND deletedAt IS NULL LIMIT 1`,
        groupId
      )
    : [null];

  const postId = generateId();
  const now = new Date().toISOString();
  const pinnedUntil = pinDays > 0 ? new Date(Date.now() + pinDays * 24 * 60 * 60 * 1000).toISOString() : null;
  const senderType = postAsGroup ? 'group' : 'user';
  const senderGroupId = postAsGroup ? senderGroup?.id ?? groupId : null;
  const senderName = postAsGroup ? senderGroup?.name ?? 'Grupo' : session.user.name || 'Usuário';
  const senderAvatar = postAsGroup ? null : session.user.image || null;

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "FeedPost" (
        id, userId, userName, userAvatar, senderType, senderGroupId, type, title, content, reference, mediaUrl, mediaType, visibility, groupId, pinnedUntil, targetUserIds, readBy, likes, comments, createdAt, updatedAt, deletedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    postId,
    session.user.email,
    senderName,
    senderAvatar,
    senderType,
    senderGroupId,
    type,
    title || null,
    content,
    reference || null,
    mediaUrl || null,
    mediaType,
    postAsGroup ? 'group' : (canTargetFeed ? visibility : 'public'),
    postAsGroup ? groupId : (canTargetFeed && visibility === 'group' ? groupId : null),
    pinnedUntil,
    canTargetFeed && visibility === 'individual' ? JSON.stringify(targetUserIds) : null,
    '[]',
    '[]',
    '[]',
    now,
    now,
    null
  );

  const [post] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, userId, userName, userAvatar, senderType, senderGroupId, type, title, content, reference, mediaUrl, mediaType, visibility, groupId, pinnedUntil, targetUserIds, readBy, likes, comments, createdAt, updatedAt
      FROM "FeedPost"
      WHERE id = ?
      LIMIT 1
    `,
    postId
  );

  if (type === 'announcement') {
    await notifyAnnouncementPublished(prisma, session.user.tenantId, {
      postId,
      actorEmail: session.user.email,
      actorName: postAsGroup ? senderName : (session.user.name || 'Usuário'),
      title,
      content,
      visibility: postAsGroup ? 'group' : (canTargetFeed ? visibility : 'public'),
      groupId: postAsGroup ? groupId : (canTargetFeed ? groupId : null),
      targetUserIds: canTargetFeed ? targetUserIds : [],
      notifyResponsibles: postAsGroup ? false : (canTargetFeed ? notifyResponsibles : false),
    });
  } else if (postAsGroup && groupId && senderGroup) {
    await notifyGroupFeedPublished(prisma, session.user.tenantId, {
      postId,
      actorEmail: session.user.email,
      groupId,
      groupName: senderGroup.name,
      title,
      content,
    });
  }

  return NextResponse.json({
    ...post,
    likes: [],
    comments: [],
    targetUserIds: parseJsonField<string[]>(typeof post.targetUserIds === 'string' ? post.targetUserIds : null, []),
    readBy: parseJsonField<string[]>(typeof post.readBy === 'string' ? post.readBy : null, []),
    createdAt: new Date(String(post.createdAt)).toISOString(),
    updatedAt: new Date(String(post.updatedAt)).toISOString(),
  }, { status: 201 });
}
