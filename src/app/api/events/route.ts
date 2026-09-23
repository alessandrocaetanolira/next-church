import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { subscribeToTenantEvents } from '@/lib/server/sse-broker';
import { hasActionPermission } from '@/lib/access-control';

export async function GET(request: NextRequest) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const email = session?.user?.email?.trim().toLowerCase();
  if (!tenantId || !email) {
    return new Response('Não autorizado', { status: 401 });
  }
  if (!hasActionPermission(session.user, 'notifications', 'view')) return new Response('Sem permissão', { status: 403 });

  const prisma = getTenantClient(tenantId);

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let closed = false;
  let polling = false;
  let lastSeen = new Date(Date.now() - 5000).toISOString();
  const deliveredIds = new Set<string>();

  const sendEvent = (data: unknown) => {
    if (closed) return;
    void writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  sendEvent({ type: 'connected', timestamp: new Date().toISOString() });

  const pushNotification = (notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    href: string | null;
    sourceType: string | null;
    sourceId: string | null;
    createdAt: string;
  }) => {
    if (deliveredIds.has(notification.id)) return;
    deliveredIds.add(notification.id);
    sendEvent({
      type: 'notification',
      notification,
    });
  };

  const unsubscribe = subscribeToTenantEvents(tenantId, (payload) => {
    if (payload.userEmail !== email) return;
    pushNotification({
      id: payload.id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      href: payload.href ?? null,
      sourceType: payload.sourceType ?? null,
      sourceId: payload.sourceId ?? null,
      createdAt: payload.createdAt,
    });
  });

  const pollNotifications = async () => {
    if (polling || closed) return;
    polling = true;

    try {
      const notifications = await prisma.$queryRawUnsafe<Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        href: string | null;
        sourceType: string | null;
        sourceId: string | null;
        createdAt: Date;
      }>>(
        `
          SELECT id, type, title, message, href, sourceType, sourceId, createdAt
          FROM "Notification"
          WHERE userEmail = ?
            AND deletedAt IS NULL
            AND datetime(createdAt) > datetime(?)
          ORDER BY datetime(createdAt) ASC, id ASC
          LIMIT 50
        `,
        email,
        lastSeen
      );

      for (const notification of notifications) {
        lastSeen = notification.createdAt.toISOString();
        pushNotification({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          href: notification.href,
          sourceType: notification.sourceType,
          sourceId: notification.sourceId,
          createdAt: notification.createdAt.toISOString(),
        });
      }
    } catch (error) {
      sendEvent({
        type: 'error',
        message: 'Falha ao consultar notificações em tempo real',
      });
      console.error('SSE poll error:', error);
    } finally {
      polling = false;
    }
  };

  const initialPollTimeout = setTimeout(() => {
    void pollNotifications();
  }, 250);

  const pollInterval = setInterval(() => {
    void pollNotifications();
  }, 2000);

  const interval = setInterval(() => {
    sendEvent({ type: 'heartbeat', timestamp: new Date().toISOString() });
  }, 30000);

  request.signal.addEventListener('abort', () => {
    closed = true;
    unsubscribe();
    clearTimeout(initialPollTimeout);
    clearInterval(pollInterval);
    clearInterval(interval);
    void writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
