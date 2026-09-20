import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { normalizeStringArray } from '@/lib/groups';
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
  if (!hasActionPermission(authorized.session.user, 'kids', 'update')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  await authorized.prisma.$executeRawUnsafe(
    `
      UPDATE "ChildProfile"
      SET name = ?, birthDate = ?, parentMemberIds = ?, allergies = ?, medications = ?, healthHistory = ?,
          dietaryRestrictions = ?, canDoPhysicalActivities = ?, notes = ?, groupIds = ?, updatedAt = ?
      WHERE id = ? AND deletedAt IS NULL
    `,
    String(body.name ?? '').trim(),
    body.birthDate ? new Date(body.birthDate).toISOString() : null,
    JSON.stringify(normalizeStringArray(body.parentMemberIds)),
    typeof body.allergies === 'string' ? body.allergies.trim() || null : null,
    typeof body.medications === 'string' ? body.medications.trim() || null : null,
    typeof body.healthHistory === 'string' ? body.healthHistory.trim() || null : null,
    typeof body.dietaryRestrictions === 'string' ? body.dietaryRestrictions.trim() || null : null,
    body.canDoPhysicalActivities === false ? 0 : 1,
    typeof body.notes === 'string' ? body.notes.trim() || null : null,
    JSON.stringify(normalizeStringArray(body.groupIds)),
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
  if (!hasActionPermission(authorized.session.user, 'kids', 'delete')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { id } = await params;
  const now = new Date().toISOString();
  await authorized.prisma.$executeRawUnsafe(
    `UPDATE "ChildProfile" SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL`,
    now,
    now,
    id
  );

  return NextResponse.json({ success: true });
}
