import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { generateId } from '@/lib/id';
import { hasActionPermission } from '@/lib/access-control';

function canManage(role?: string | null) {
  return ['ADMIN', 'PASTOR', 'LEADER'].includes(role?.toUpperCase() ?? '');
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'parking', 'view')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const groupId = request.nextUrl.searchParams.get('groupId');
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const spots = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, groupId, label, status, occupiedByMemberId, occupiedByName, notes, occupiedAt, createdAt, updatedAt
      FROM "ParkingSpot"
      WHERE deletedAt IS NULL
        AND (? IS NULL OR groupId = ?)
      ORDER BY label ASC
    `,
    groupId,
    groupId
  );

  return NextResponse.json(spots);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId || !canManage(session.user.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'parking', 'create')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await request.json();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const id = generateId();
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "ParkingSpot" (id, groupId, label, status, occupiedByMemberId, occupiedByName, notes, occupiedAt, createdAt, updatedAt, deletedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    String(body.groupId ?? '').trim(),
    String(body.label ?? '').trim(),
    typeof body.status === 'string' ? body.status.trim() || 'free' : 'free',
    typeof body.occupiedByMemberId === 'string' ? body.occupiedByMemberId.trim() || null : null,
    typeof body.occupiedByName === 'string' ? body.occupiedByName.trim() || null : null,
    typeof body.notes === 'string' ? body.notes.trim() || null : null,
    body.occupiedAt ? new Date(body.occupiedAt).toISOString() : null,
    now,
    now,
    null
  );

  return NextResponse.json({ success: true, id }, { status: 201 });
}
