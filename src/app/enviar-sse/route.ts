import { sendSseTest } from '@/server/test-webhooks/test-notification.controller';
import { isLocalTestWebhookRequest } from '@/server/test-webhooks/test-webhook-access';
import { serverLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  serverLogger.info('webhook-sse', 'requisição recebida', { host });
  if (process.env.ENABLE_TEST_WEBHOOKS !== 'true' || !isLocalTestWebhookRequest(request)) {
    serverLogger.warn('webhook-sse', 'requisição bloqueada', { enabled: process.env.ENABLE_TEST_WEBHOOKS === 'true', host });
    return Response.json({ error: 'Webhook de teste disponível apenas localmente.' }, { status: 404 });
  }
  try {
    const body = await request.json();
    const tenantId = typeof body?.tenantId === 'string' ? body.tenantId : '';
    serverLogger.info('webhook-sse', 'payload recebido', { tenantId, userEmail: body?.userEmail, type: body?.type });
    if (!tenantId) {
      serverLogger.warn('webhook-sse', 'tenantId ausente');
      return Response.json({ error: 'tenantId é obrigatório.' }, { status: 400 });
    }
    const result = await sendSseTest(tenantId, body);
    serverLogger.info('webhook-sse', 'notificação publicada', result);
    return Response.json(result);
  } catch (error) {
    serverLogger.error('webhook-sse', 'falha ao processar requisição', { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: error instanceof Error ? error.message : 'Falha no webhook SSE.' }, { status: 400 });
  }
}
