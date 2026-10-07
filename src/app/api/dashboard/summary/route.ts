import { auth } from '@/auth';
import { UnauthenticatedError } from '@/lib/http/errors';
import { jsonError, jsonOk } from '@/lib/http/response';
import { getTenantClient } from '@/lib/prisma-factory';
import { getTeamScopedAccess } from '@/lib/server/team-scope';
import { getDashboardSummary } from '@/server/dashboard/dashboard.controller';
import { DashboardRepository } from '@/server/dashboard/dashboard.repository';
import { DashboardService } from '@/server/dashboard/dashboard.service';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) throw new UnauthenticatedError();

    const prisma = getTenantClient(session.user.tenantId);
    const service = new DashboardService(new DashboardRepository(prisma));
    const taskScope = await getTeamScopedAccess(session, 'tasks');
    return jsonOk(await getDashboardSummary({ user: session.user, taskScope, service }));
  } catch (error) {
    return jsonError(error);
  }
}
