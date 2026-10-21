import { auth } from '@/auth';
import { registerPushSubscription, removePushSubscription } from '@/server/notifications/push-subscriptions.controller';
import { registerPlatformPushSubscription, removePlatformPushSubscription } from '@/server/notifications/platform-push.controller';
import { serverLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';

function platformPushFailure(error: unknown, invalidInput: string) {
  if (error instanceof Error && /no such table:.*Platform(?:PushSubscription|Notification)/i.test(error.message)) {
    serverLogger.error('push', 'Migração de notificações globais pendente.');
    return Response.json({ error: 'As notificações do administrador estão temporariamente indisponíveis.' }, { status: 503 });
  }
  return Response.json({ error: invalidInput }, { status: 400 });
}

export async function POST(request: Request) {
  serverLogger.info('push-server', 'POST /api/push/subscriptions recebido');
  const session = await auth();
  if (session?.user?.authValid === false) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const tenantId = session?.user?.tenantId;
  const email = session?.user?.email;
  const platformAdminId = session?.user?.isPlatformAdmin ? session.user.id : null;
  serverLogger.info('push-server', 'sessão resolvida', { authenticated: Boolean(session?.user), tenantId: tenantId || null, email: email || null });
  if (platformAdminId) {
    try {
      return Response.json(await registerPlatformPushSubscription(platformAdminId, await request.json()));
    } catch (error) {
      return platformPushFailure(error, 'Inscrição Push inválida.');
    }
  }
  if (!tenantId || !email) {
    serverLogger.warn('push', 'registro rejeitado: sessão ausente ou sem tenant');
    return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  try {
    const body = await request.json();
    serverLogger.info('push-server', 'payload recebido', { endpoint: typeof body?.endpoint === 'string' ? body.endpoint.slice(0, 80) : null, hasKeys: Boolean(body?.keys) });
    const result = await registerPushSubscription(tenantId, email, body);
    serverLogger.info('push', 'subscription registrada', { tenantId, email });
    return Response.json(result);
  } catch (error) {
    serverLogger.error('push', 'falha ao registrar subscription', {
      tenantId,
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: 'Inscrição Push inválida.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (session?.user?.authValid === false) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const tenantId = session?.user?.tenantId;
  const email = session?.user?.email;
  const platformAdminId = session?.user?.isPlatformAdmin ? session.user.id : null;
  if (platformAdminId) {
    try {
      return Response.json(await removePlatformPushSubscription(platformAdminId, await request.json()));
    } catch (error) {
      return platformPushFailure(error, 'Endpoint inválido.');
    }
  }
  if (!tenantId || !email) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    return Response.json(await removePushSubscription(tenantId, email, await request.json()));
  } catch {
    return Response.json({ error: 'Endpoint inválido.' }, { status: 400 });
  }
}
