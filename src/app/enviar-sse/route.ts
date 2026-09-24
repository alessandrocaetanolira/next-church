import { sendSseTest } from '@/server/test-webhooks/test-notification.controller';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (process.env.ENABLE_TEST_WEBHOOKS !== 'true') return Response.json({ error: 'Webhook de teste desabilitado.' }, { status: 404 });
  try {
    const body = await request.json();
    const tenantId = typeof body?.tenantId === 'string' ? body.tenantId : '';
    if (!tenantId) return Response.json({ error: 'tenantId é obrigatório.' }, { status: 400 });
    return Response.json(await sendSseTest(tenantId, body));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Falha no webhook SSE.' }, { status: 400 });
  }
}
