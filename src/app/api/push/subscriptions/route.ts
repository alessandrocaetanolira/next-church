import { auth } from '@/auth';
import { registerPushSubscription, removePushSubscription } from '@/server/notifications/push-subscriptions.controller';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const email = session?.user?.email;
  if (!tenantId || !email) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    return Response.json(await registerPushSubscription(tenantId, email, await request.json()));
  } catch {
    return Response.json({ error: 'Inscrição Push inválida.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const email = session?.user?.email;
  if (!tenantId || !email) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    return Response.json(await removePushSubscription(tenantId, email, await request.json()));
  } catch {
    return Response.json({ error: 'Endpoint inválido.' }, { status: 400 });
  }
}
