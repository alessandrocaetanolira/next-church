import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { hasActionPermission } from '@/lib/access-control';

async function authorize() {
  const session = await auth();
  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR', 'LEADER'].includes(session.user.role?.toUpperCase() ?? '')) {
    return null;
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { session, prisma };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await authorize();
  if (!authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!hasActionPermission(authorized.session.user, 'parking', 'update')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params;
  const body = await request.json();

  await authorized.prisma.$executeRawUnsafe(
    `
      UPDATE "ParkingSpot"
      SET groupId = ?, label = ?, status = ?, occupiedByMemberId = ?, occupiedByName = ?, notes = ?, occupiedAt = ?, updatedAt = ?
      WHERE id = ? AND deletedAt IS NULL
    `,
    String(body.groupId ?? '').trim(),
    String(body.label ?? '').trim(),
    typeof body.status === 'string' ? body.status.trim() || 'free' : 'free',
    typeof body.occupiedByMemberId === 'string' ? body.occupiedByMemberId.trim() || null : null,
    typeof body.occupiedByName === 'string' ? body.occupiedByName.trim() || null : null,
    typeof body.notes === 'string' ? body.notes.trim() || null : null,
    body.occupiedAt ? new Date(body.occupiedAt).toISOString() : null,
    new Date().toISOString(),
    id
  );

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await authorize();
  if (!authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!hasActionPermission(authorized.session.user, 'parking', 'update')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params;
  const body = await request.json();

  await authorized.prisma.$executeRawUnsafe(
    `
      UPDATE "ParkingSpot"
      SET status = ?, occupiedByMemberId = ?, occupiedByName = ?, notes = ?, occupiedAt = ?, updatedAt = ?
      WHERE id = ? AND deletedAt IS NULL
    `,
    typeof body.status === 'string' ? body.status.trim() || 'free' : 'free',
    typeof body.occupiedByMemberId === 'string' ? body.occupiedByMemberId.trim() || null : null,
    typeof body.occupiedByName === 'string' ? body.occupiedByName.trim() || null : null,
    typeof body.notes === 'string' ? body.notes.trim() || null : null,
    body.occupiedAt ? new Date(body.occupiedAt).toISOString() : null,
    new Date().toISOString(),
    id
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await authorize();
  if (!authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!hasActionPermission(authorized.session.user, 'parking', 'delete')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const { id } = await params;
  const now = new Date().toISOString();

  await authorized.prisma.$executeRawUnsafe(
    `UPDATE "ParkingSpot" SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL`,
    now,
    now,
    id
  );

  return NextResponse.json({ success: true });
}
