import { auth } from '@/auth';
import { openGlobalAdminStream, openNotificationsStream } from '@/server/notifications/notifications-stream.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const email = session?.user?.email;
  if (session?.user && (session.user as { authValid?: boolean }).authValid === false) return new Response('Não autorizado', { status: 401 });
  if (session?.user?.isPlatformAdmin && session.user.id) return openGlobalAdminStream(request, session.user.id);
  if (!tenantId || !email) return new Response('Não autorizado', { status: 401 });
  // O stream também entrega atualizações de permissões e eventos de módulos.
  // A autenticação do tenant é suficiente; cada evento continua filtrado por
  // tenant e destinatário no broker.
  return openNotificationsStream(request, tenantId, email, session.user);
}
