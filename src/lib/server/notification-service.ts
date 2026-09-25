import { PrismaClient } from '../../../src/generated/prisma-tenant';
import { publishTenantEvent } from '@/infra/sse/sse-broker';
import { webPushService } from '@/infra/web-push/web-push-service';
import { PushSubscriptionsRepository } from '@/server/notifications/push-subscriptions.repository';
import { generateId } from '@/lib/id';

/**
 * Mensagem normalizada produzida por qualquer módulo de negócio.
 *
 * `userEmail` é o destinatário. O remetente deve ser contextualizado pelo
 * módulo na mensagem (por exemplo, o nome de quem publicou ou operou). O
 * dispatcher não depende de entidades específicas da cantina, feed ou grupos.
 */
export type NotificationInput = {
  userEmail: string;
  senderEmail?: string | null;
  senderName?: string | null;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
};

export type NotificationContent = Omit<NotificationInput, 'userEmail' | 'senderEmail' | 'senderName'>;

export type NotificationCommand = {
  recipients: string[];
  sender?: { email?: string | null; name?: string | null };
  content: NotificationContent;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getCanteenRecipientEmails(prisma: PrismaClient) {
  const rows = await prisma.$queryRawUnsafe<Array<{ email: string }>>(
    `
      SELECT DISTINCT email
      FROM "User"
      WHERE active = 1
        AND deletedAt IS NULL
        AND (
          UPPER(COALESCE(role, '')) IN ('ADMIN', 'PASTOR', 'CANTEEN')
          OR UPPER(COALESCE(permissions, '')) LIKE '%CANTEEN%'
        )
    `
  );

  return Array.from(new Set(rows.map((row) => normalizeEmail(row.email)).filter(Boolean)));
}

async function getActiveUserEmails(prisma: PrismaClient) {
  const rows = await prisma.$queryRawUnsafe<Array<{ email: string }>>(
    `
      SELECT DISTINCT email
      FROM "User"
      WHERE active = 1
        AND deletedAt IS NULL
    `
  );

  return Array.from(new Set(rows.map((row) => normalizeEmail(row.email)).filter(Boolean)));
}

async function getGroupMemberEmails(prisma: PrismaClient, groupId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ email: string | null }>>(
    `
      SELECT DISTINCT u.email as email
      FROM "GroupMember" gm
      INNER JOIN "User" u ON u.linkedMemberId = gm.memberId
      WHERE gm.groupId = ?
        AND gm.deletedAt IS NULL
        AND u.active = 1
        AND u.deletedAt IS NULL
    `,
    groupId
  );

  return Array.from(new Set(rows.map((row) => normalizeEmail(row.email ?? '')).filter(Boolean)));
}

async function getGroupResponsibleEmails(prisma: PrismaClient, groupId: string) {
  const [group] = await prisma.$queryRawUnsafe<Array<{ type: string | null }>>(
    `SELECT type FROM "Group" WHERE id = ? AND deletedAt IS NULL LIMIT 1`,
    groupId
  );

  const leaders = await prisma.$queryRawUnsafe<Array<{ email: string | null }>>(
    `
      SELECT DISTINCT u.email as email
      FROM "GroupMember" gm
      INNER JOIN "User" u ON u.linkedMemberId = gm.memberId
      WHERE gm.groupId = ?
        AND gm.deletedAt IS NULL
        AND gm.role IN ('leader', 'responsible')
        AND u.active = 1
        AND u.deletedAt IS NULL
    `,
    groupId
  );

  const emails = new Set(leaders.map((row) => normalizeEmail(row.email ?? '')).filter(Boolean));

  if (group?.type === 'kids') {
    const children = await prisma.$queryRawUnsafe<Array<{ parentMemberIds: string | null }>>(
      `
        SELECT parentMemberIds
        FROM "ChildProfile"
        WHERE deletedAt IS NULL
          AND (',' || REPLACE(REPLACE(REPLACE(COALESCE(groupIds, '[]'), '[', ''), ']', ''), '\"', '') || ',') LIKE ?
      `,
      `%,${groupId},%`
    );

    const parentIds = Array.from(
      new Set(
        children.flatMap((child) => {
          try {
            const parsed = JSON.parse(child.parentMemberIds ?? '[]');
            return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
          } catch {
            return [];
          }
        })
      )
    );

    if (parentIds.length) {
      const placeholders = parentIds.map(() => '?').join(', ');
      const parentUsers = await prisma.$queryRawUnsafe<Array<{ email: string | null }>>(
        `
          SELECT DISTINCT email
          FROM "User"
          WHERE linkedMemberId IN (${placeholders})
            AND active = 1
            AND deletedAt IS NULL
        `,
        ...parentIds
      );

      parentUsers.forEach((row) => {
        const email = normalizeEmail(row.email ?? '');
        if (email) emails.add(email);
      });
    }
  }

  return Array.from(emails);
}

async function getAdminAndPastorEmails(prisma: PrismaClient) {
  const rows = await prisma.$queryRawUnsafe<Array<{ email: string }>>(
    `
      SELECT DISTINCT email
      FROM "User"
      WHERE active = 1
        AND deletedAt IS NULL
        AND UPPER(COALESCE(role, '')) IN ('ADMIN', 'PASTOR')
    `
  );

  return Array.from(new Set(rows.map((row) => normalizeEmail(row.email)).filter(Boolean)));
}

async function getTeamLeaderEmails(prisma: PrismaClient, teamId: string) {
  const [team] = await prisma.$queryRawUnsafe<Array<{ leaderIds: string | null }>>(
    `
      SELECT leaderIds
      FROM "Team"
      WHERE id = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    teamId
  );

  const leaderIds = team?.leaderIds
    ? team.leaderIds.split(',').map((value) => value.trim()).filter(Boolean)
    : [];

  if (!leaderIds.length) return [];

  const users = await prisma.$queryRawUnsafe<Array<{ email: string; linkedMemberId: string | null }>>(
    `
      SELECT email, linkedMemberId
      FROM "User"
      WHERE active = 1 AND deletedAt IS NULL
    `
  );

  return Array.from(
    new Set(
      users
        .filter((user) => user.linkedMemberId && leaderIds.includes(user.linkedMemberId))
        .map((user) => normalizeEmail(user.email))
        .filter(Boolean)
    )
  );
}

async function getMemberEmail(prisma: PrismaClient, memberId: string) {
  const [member] = await prisma.$queryRawUnsafe<Array<{ email: string | null }>>(
    `
      SELECT email
      FROM "Member"
      WHERE id = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    memberId
  );

  if (member?.email) return normalizeEmail(member.email);
  const [linkedUser] = await prisma.$queryRawUnsafe<Array<{ email: string | null }>>(
    `SELECT email FROM "User" WHERE linkedMemberId = ? AND active = 1 AND deletedAt IS NULL LIMIT 1`,
    memberId,
  );
  return linkedUser?.email ? normalizeEmail(linkedUser.email) : null;
}

async function getMemberEmails(prisma: PrismaClient, memberIds: string[]) {
  const normalizedIds = Array.from(new Set(memberIds.filter(Boolean)));
  if (!normalizedIds.length) return [] as string[];

  const placeholders = normalizedIds.map(() => '?').join(', ');
  const users = await prisma.$queryRawUnsafe<Array<{ email: string | null }>>(
    `
      SELECT DISTINCT email
      FROM "User"
      WHERE linkedMemberId IN (${placeholders})
        AND active = 1
        AND deletedAt IS NULL
    `,
    ...normalizedIds
  );

  return Array.from(new Set(users.map((user) => normalizeEmail(user.email ?? '')).filter(Boolean)));
}

async function getFeedPostAuthorEmail(prisma: PrismaClient, postId: string) {
  const [post] = await prisma.$queryRawUnsafe<Array<{ userId: string | null }>>(
    `
      SELECT userId
      FROM "FeedPost"
      WHERE id = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    postId
  );

  return post?.userId ? normalizeEmail(post.userId) : null;
}

/**
 * Dispatcher compartilhado: persiste, publica via SSE e tenta entregar Push.
 * Falhas de Push não impedem a persistência nem o SSE.
 */
export async function createNotifications(
  prisma: PrismaClient,
  tenantId: string,
  notifications: NotificationInput[]
) {
  const now = new Date().toISOString();
  let firstNotificationId: string | undefined;

  for (const notification of notifications) {
    const email = normalizeEmail(notification.userEmail);
    if (!email) continue;

    const id = generateId();
    firstNotificationId ??= id;

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "Notification" (
          id, userEmail, senderEmail, senderName, type, title, message, href, sourceType, sourceId, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      email,
      notification.senderEmail ? normalizeEmail(notification.senderEmail) : null,
      notification.senderName?.trim() || null,
      notification.type,
      notification.title,
      notification.message,
      notification.href ?? null,
      notification.sourceType ?? null,
      notification.sourceId ?? null,
      now,
      now
    );

    publishTenantEvent({
      id,
      tenantId,
      userEmail: email,
      senderEmail: notification.senderEmail ? normalizeEmail(notification.senderEmail) : null,
      senderName: notification.senderName?.trim() || null,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      href: notification.href ?? null,
      sourceType: notification.sourceType ?? null,
      sourceId: notification.sourceId ?? null,
      createdAt: now,
    });
  }

  const recipients = Array.from(new Set(notifications.map((notification) => normalizeEmail(notification.userEmail)).filter(Boolean)));
  if (!recipients.length) return;
  try {
    const subscriptionsRepository = new PushSubscriptionsRepository(prisma);
    const subscriptions = await subscriptionsRepository.listByEmails(recipients);
    const firstNotification = notifications[0];
    const notificationUrl = firstNotification?.href ?? '/notifications';
    const result = await webPushService.send(
      subscriptions,
      {
        title: firstNotification?.title ?? 'Nova notificação',
        body: firstNotification?.message ?? 'Você recebeu uma nova notificação.',
        url: notificationUrl,
        tag: firstNotification?.type,
        data: {
          type: firstNotification?.type,
          tipo: firstNotification?.type,
          titulo: firstNotification?.title ?? 'Nova notificação',
          mensagem: firstNotification?.message ?? 'Você recebeu uma nova notificação.',
          senderEmail: firstNotification?.senderEmail ?? null,
          senderName: firstNotification?.senderName ?? null,
          url: notificationUrl,
          link: notificationUrl,
          mobileLink: notificationUrl,
          webLink: notificationUrl,
          notificationId: firstNotificationId,
        },
      },
    );
    if (result.expiredIds.length) await subscriptionsRepository.removeMany(result.expiredIds);
  } catch (error) {
    console.warn('[push] entrega ignorada:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Envia uma mensagem para vários usuários sem expor detalhes de transporte.
 * Módulos de negócio devem fornecer apenas destinatários, remetente e conteúdo.
 */
export async function sendNotification(
  prisma: PrismaClient,
  tenantId: string,
  command: NotificationCommand,
) {
  const senderEmail = command.sender?.email ? normalizeEmail(command.sender.email) : null;
  const senderName = command.sender?.name?.trim() || null;
  return createNotifications(
    prisma,
    tenantId,
    command.recipients.map((userEmail) => ({ ...command.content, userEmail, senderEmail, senderName })),
  );
}

export async function notifyCanteenNewOrder(
  prisma: PrismaClient,
  tenantId: string,
  sale: {
    id: string;
    memberName: string | null;
    total: number;
  }
) {
  const recipients = await getCanteenRecipientEmails(prisma);
  if (!recipients.length) return;

  await sendNotification(prisma, tenantId, {
    recipients,
    content: {
      type: 'canteen-order-new',
      title: 'Novo pedido na cantina',
      message: `${sale.memberName || 'Pedido sem identificação'} enviou um pedido de R$ ${sale.total.toFixed(2)}.`,
      href: '/cantina?tab=orders',
      sourceType: 'sale',
      sourceId: sale.id,
    },
  });
}

export async function notifyMemberOrderUpdate(
  prisma: PrismaClient,
  tenantId: string,
  payload: {
    saleId: string;
    memberId?: string | null;
    title: string;
    message: string;
    href?: string;
    type: string;
    sender?: { email?: string | null; name?: string | null };
  }
) {
  if (!payload.memberId) return;

  const email = await getMemberEmail(prisma, payload.memberId);
  if (!email) return;

  await sendNotification(prisma, tenantId, {
    recipients: [email],
    sender: payload.sender,
    content: {
      type: payload.type,
      title: payload.title,
      message: payload.message,
      href: payload.href ?? '/carteira?view=order',
      sourceType: 'sale',
      sourceId: payload.saleId,
    },
  });
}

/** Notifica o membro sobre uma alteração no saldo da cantina. */
export async function notifyMemberCreditUpdate(
  prisma: PrismaClient,
  tenantId: string,
  payload: {
    memberId: string;
    type: string;
    title: string;
    message: string;
    sender?: { email?: string | null; name?: string | null };
    sourceId?: string | null;
  },
) {
  const email = await getMemberEmail(prisma, payload.memberId);
  if (!email) return;

  await sendNotification(prisma, tenantId, {
    recipients: [email],
    sender: payload.sender,
    content: {
      type: payload.type,
      title: payload.title,
      message: payload.message,
      href: '/carteira?view=debt',
      sourceType: 'canteen-credit',
      sourceId: payload.sourceId ?? null,
    },
  });
}

export async function notifyFeedLike(
  prisma: PrismaClient,
  tenantId: string,
  payload: {
    postId: string;
    actorEmail: string;
    actorName: string;
  }
) {
  const authorEmail = await getFeedPostAuthorEmail(prisma, payload.postId);
  if (!authorEmail || authorEmail === normalizeEmail(payload.actorEmail)) return;

  await createNotifications(prisma, tenantId, [
    {
      userEmail: authorEmail,
      type: 'feed-like',
      title: 'Nova curtida no seu post',
      message: `${payload.actorName} curtiu sua publicação.`,
      href: '/feed',
      sourceType: 'feed',
      sourceId: payload.postId,
    },
  ]);
}

export async function notifyFeedComment(
  prisma: PrismaClient,
  tenantId: string,
  payload: {
    postId: string;
    actorEmail: string;
    actorName: string;
    content: string;
  }
) {
  const authorEmail = await getFeedPostAuthorEmail(prisma, payload.postId);
  if (!authorEmail || authorEmail === normalizeEmail(payload.actorEmail)) return;

  const preview = payload.content.length > 80 ? `${payload.content.slice(0, 77)}...` : payload.content;

  await createNotifications(prisma, tenantId, [
    {
      userEmail: authorEmail,
      type: 'feed-comment',
      title: 'Novo comentário na sua publicação',
      message: `${payload.actorName} comentou: "${preview}"`,
      href: '/feed',
      sourceType: 'feed',
      sourceId: payload.postId,
    },
  ]);
}

export async function notifyAnnouncementPublished(
  prisma: PrismaClient,
  tenantId: string,
  payload: {
    postId: string;
    actorEmail: string;
    actorName: string;
    content: string;
    title?: string | null;
    visibility?: 'public' | 'group' | 'individual';
    groupId?: string | null;
    targetUserIds?: string[];
    notifyResponsibles?: boolean;
  }
) {
  let recipients: string[] = [];
  if (payload.visibility === 'individual') {
    recipients = payload.targetUserIds?.map((email) => normalizeEmail(email)).filter(Boolean) ?? [];
  } else if (payload.visibility === 'group' && payload.groupId) {
    recipients = await getGroupMemberEmails(prisma, payload.groupId);
    if (payload.notifyResponsibles) {
      const responsibles = await getGroupResponsibleEmails(prisma, payload.groupId);
      recipients = Array.from(new Set([...recipients, ...responsibles]));
    }
  } else {
    recipients = await getActiveUserEmails(prisma);
  }

  const preview = payload.content.length > 90 ? `${payload.content.slice(0, 87)}...` : payload.content;
  const heading = payload.title?.trim() ? `Novo aviso: ${payload.title.trim()}` : 'Novo aviso pastoral';

  await createNotifications(
    prisma,
    tenantId,
    recipients
      .filter((email) => email !== normalizeEmail(payload.actorEmail))
      .map((userEmail) => ({
        userEmail,
        type: 'announcement',
        title: heading,
        message: `${payload.actorName} publicou um aviso: "${preview}"`,
        href: '/feed?type=announcement',
        sourceType: 'feed',
        sourceId: payload.postId,
      }))
  );
}

export async function notifyGroupFeedPublished(
  prisma: PrismaClient,
  tenantId: string,
  payload: {
    postId: string;
    actorEmail: string;
    groupId: string;
    groupName: string;
    title?: string | null;
    content: string;
  }
) {
  const recipients = await getGroupMemberEmails(prisma, payload.groupId);
  if (!recipients.length) return;

  const preview = payload.content.length > 90 ? `${payload.content.slice(0, 87)}...` : payload.content;
  const heading = payload.title?.trim() ? payload.title.trim() : `Nova publicação em ${payload.groupName}`;

  await createNotifications(
    prisma,
    tenantId,
    recipients
      .filter((email) => email !== normalizeEmail(payload.actorEmail))
      .map((userEmail) => ({
        userEmail,
        type: 'group-post',
        title: heading,
        message: `${payload.groupName}: "${preview}"`,
        href: `/groups/${payload.groupId}`,
        sourceType: 'feed',
        sourceId: payload.postId,
      }))
  );
}

export async function notifyTeamJoinRequest(
  prisma: PrismaClient,
  tenantId: string,
  payload: {
    requestId: string;
    memberName: string;
    teamId: string;
    teamName: string;
  }
) {
  const [leaderEmails, adminPastorEmails] = await Promise.all([
    getTeamLeaderEmails(prisma, payload.teamId),
    getAdminAndPastorEmails(prisma),
  ]);

  const recipients = Array.from(new Set([...leaderEmails, ...adminPastorEmails]));
  if (!recipients.length) return;

  await createNotifications(
    prisma,
    tenantId,
    recipients.map((userEmail) => ({
      userEmail,
      type: 'team-join-request',
      title: 'Nova solicitação de ingresso em grupo',
      message: `${payload.memberName} solicitou ingresso no grupo ${payload.teamName}.`,
      href: '/groups?type=team',
      sourceType: 'teamJoinRequest',
      sourceId: payload.requestId,
    }))
  );
}

export async function notifyChildResponsibles(
  prisma: PrismaClient,
  tenantId: string,
  payload: {
    childId: string;
    childName: string;
    parentMemberIds: string[];
    actorName: string;
    title: string;
    message: string;
  }
) {
  const recipients = await getMemberEmails(prisma, payload.parentMemberIds);
  if (!recipients.length) return;

  await createNotifications(
    prisma,
    tenantId,
    recipients.map((userEmail) => ({
      userEmail,
      type: 'kids-private-message',
      title: payload.title,
      message: `${payload.actorName}: ${payload.message}`,
      href: '/kids',
      sourceType: 'childProfile',
      sourceId: payload.childId,
    }))
  );
}

export async function notifyParkingOwner(
  prisma: PrismaClient,
  tenantId: string,
  payload: {
    spotId: string;
    occupiedByMemberId?: string | null;
    actorName: string;
    title: string;
    message: string;
  }
) {
  if (!payload.occupiedByMemberId) return;
  const recipients = await getMemberEmails(prisma, [payload.occupiedByMemberId]);
  if (!recipients.length) return;

  await createNotifications(
    prisma,
    tenantId,
    recipients.map((userEmail) => ({
      userEmail,
      type: 'parking-private-message',
      title: payload.title,
      message: `${payload.actorName}: ${payload.message}`,
      href: '/parking',
      sourceType: 'parkingSpot',
      sourceId: payload.spotId,
    }))
  );
}
