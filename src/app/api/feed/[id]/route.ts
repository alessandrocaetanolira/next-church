import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { notifyFeedComment, notifyFeedLike } from '@/lib/server/notification-service';
import { generateId } from '@/lib/id';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { parseJsonField } from '@/lib/groups';
import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  const body = await request.json();
  const actionPermission = body.action === 'add-comment' || body.action === 'toggle-like' ? 'comment' : 'update';
  if (!hasAnyActionPermission(session.user, 'feed', [actionPermission, 'update'])) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const [post] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, userId, userName, userAvatar, type, title, content, reference, mediaUrl, mediaType, visibility, groupId, targetUserIds, readBy, likes, comments, createdAt, updatedAt, deletedAt
      FROM "FeedPost"
      WHERE id = ?
      LIMIT 1
    `,
    id
  );

  if (!post || post.deletedAt) {
    return NextResponse.json({ error: 'Publicação não encontrada' }, { status: 404 });
  }

  const likes = parseJsonField<string[]>(typeof post.likes === 'string' ? post.likes : null, []);
  const comments = parseJsonField<Array<Record<string, string>>>(typeof post.comments === 'string' ? post.comments : null, []);

  if (body.action === 'toggle-like') {
    const wasLiked = likes.includes(session.user.email);
    const nextLikes = wasLiked
      ? likes.filter((userId) => userId !== session.user.email)
      : [...likes, session.user.email];

    await prisma.$executeRawUnsafe(`UPDATE "FeedPost" SET likes = ?, updatedAt = ? WHERE id = ?`, JSON.stringify(nextLikes), new Date().toISOString(), id);

    if (!wasLiked) {
      await notifyFeedLike(prisma, tenantId, {
        postId: id,
        actorEmail: session.user.email,
        actorName: session.user.name || 'Usuário',
      });
    }

    return NextResponse.json({
      ...post,
      likes: nextLikes,
      comments,
      createdAt: new Date(String(post.createdAt)).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (body.action === 'add-comment') {
    const content = String(body.content ?? '').trim();
    if (!content) {
      return NextResponse.json({ error: 'Comentário obrigatório' }, { status: 400 });
    }

    const nextComments = [
      ...comments,
      {
        id: generateId(),
        userId: session.user.email,
        userName: session.user.name || 'Usuário',
        content,
        createdAt: new Date().toISOString(),
      },
    ];

    await prisma.$executeRawUnsafe(`UPDATE "FeedPost" SET comments = ?, updatedAt = ? WHERE id = ?`, JSON.stringify(nextComments), new Date().toISOString(), id);

    await notifyFeedComment(prisma, tenantId, {
      postId: id,
      actorEmail: session.user.email,
      actorName: session.user.name || 'Usuário',
      content,
    });

    return NextResponse.json({
      ...post,
      likes,
      comments: nextComments,
      createdAt: new Date(String(post.createdAt)).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = session?.user?.role?.toUpperCase();
  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'feed', 'delete')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { id } = await context.params;
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const [post] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT id, deletedAt FROM "FeedPost" WHERE id = ? LIMIT 1`,
    id
  );

  if (!post || post.deletedAt) {
    return NextResponse.json({ error: 'Publicação não encontrada' }, { status: 404 });
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "FeedPost" SET deletedAt = ?, updatedAt = ? WHERE id = ?`,
    new Date().toISOString(),
    new Date().toISOString(),
    id
  );

  return NextResponse.json({ success: true });
}
