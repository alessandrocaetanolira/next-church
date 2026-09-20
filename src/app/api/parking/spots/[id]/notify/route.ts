import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { notifyParkingOwner } from '@/lib/server/notification-service';
import { hasActionPermission } from '@/lib/access-control';

function canManage(role?: string | null) {
  return ['ADMIN', 'PASTOR', 'LEADER'].includes(role?.toUpperCase() ?? '');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId || !canManage(session.user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'parking', 'update')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const title = String(body.title ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (!title || !message) {
    return NextResponse.json({ error: 'Título e mensagem são obrigatórios.' }, { status: 400 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const [spot] = await prisma.$queryRawUnsafe<Array<{
    id: string;
    label: string;
    occupiedByMemberId: string | null;
  }>>(
    `
      SELECT id, label, occupiedByMemberId
      FROM "ParkingSpot"
      WHERE id = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    id
  );

  if (!spot) {
    return NextResponse.json({ error: 'Vaga não encontrada.' }, { status: 404 });
  }

  if (!spot.occupiedByMemberId) {
    return NextResponse.json({ error: 'Esta vaga não possui um membro vinculado no momento.' }, { status: 409 });
  }

  await notifyParkingOwner(prisma, session.user.tenantId, {
    spotId: spot.id,
    occupiedByMemberId: spot.occupiedByMemberId,
    actorName: session.user.name || 'Equipe',
    title,
    message,
  });

  return NextResponse.json({ success: true });
}
