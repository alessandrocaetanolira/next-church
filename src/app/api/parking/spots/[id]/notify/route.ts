import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { notifyParking } from '@/server/parking/parking.controller';
import { ParkingRepository } from '@/server/parking/parking.repository';
import { ParkingService } from '@/server/parking/parking.service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) throw new UnauthenticatedError();
    const prisma = getTenantClient(session.user.tenantId);
    const service = new ParkingService(new ParkingRepository(prisma), prisma, session.user.tenantId);
    return jsonOk(await notifyParking(session.user, service, (await params).id, await request.json(), session.user.name || 'Equipe'));
  } catch (error) { return jsonError(error); }
}
