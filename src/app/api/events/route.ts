import { auth } from '@/auth';
import { hasActionPermission } from '@/lib/access-control';
import { openNotificationsStream } from '@/server/notifications/notifications-stream.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const email = session?.user?.email;
  if (!tenantId || !email) return new Response('Não autorizado', { status: 401 });
  if (!hasActionPermission(session.user, 'notifications', 'view')) {
    return new Response('Sem permissão', { status: 403 });
  }
  return openNotificationsStream(request, tenantId, email);
}
