import { auth } from '@/auth';
import { UnauthenticatedError, ForbiddenError } from '@/lib/http/errors';
import type { Session } from 'next-auth';

export type TenantContext = {
  session: Session;
  tenantId: string;
  tenantSlug: string;
  userId: string;
};

export async function requireTenantContext(): Promise<TenantContext> {
  const session = await auth();
  const user = session?.user as (typeof session extends null ? never : NonNullable<typeof session>['user'] & {
    id?: string;
    tenantId?: string;
    tenantSlug?: string;
  }) | undefined;

  if (!session?.user) throw new UnauthenticatedError();
  if (!user?.tenantId || !user.id) throw new ForbiddenError('A sessão não possui um tenant válido.');

  return {
    session,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug || user.tenantId,
    userId: user.id,
  };
}
