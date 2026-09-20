import { auth } from '@/auth';
import { ForbiddenError, UnauthenticatedError } from '@/lib/http/errors';

export async function requirePlatformAdminContext() {
  const session = await auth();
  if (!session?.user) throw new UnauthenticatedError();

  const user = session.user as typeof session.user & { id?: string; isPlatformAdmin?: boolean };
  if (!user.id || !user.isPlatformAdmin) throw new ForbiddenError('Acesso exclusivo ao administrador global.');

  return {
    session,
    userId: user.id,
  };
}
