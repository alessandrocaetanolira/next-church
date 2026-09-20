import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { hasAnyActionPermission, hasActionPermission } from '@/lib/access-control';

async function authorize(action: 'update' | 'delete') {
  const session = await auth();
  if (!session?.user?.tenantId || !hasAnyActionPermission(session.user, 'materials', [action, 'manage'])) {
    return null;
  }
  return session;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authorize('update');
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  const { name, category, quantity, minQuantity, unit } = await request.json();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Material"
      SET name = ?, category = ?, quantity = ?, minQuantity = ?, unit = ?, updatedAt = ?
      WHERE id = ?
    `,
    name,
    category,
    quantity ?? 0,
    minQuantity ?? 0,
    unit ?? 'unidades',
    new Date().toISOString(),
    id
  );

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authorize('update');
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  const { quantity } = await request.json();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  await prisma.$executeRawUnsafe(
    `UPDATE "Material" SET quantity = ?, updatedAt = ? WHERE id = ?`,
    Math.max(0, Number(quantity) || 0),
    new Date().toISOString(),
    id
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authorize('delete');
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await params;
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  await prisma.$executeRawUnsafe(
    `UPDATE "Material" SET deletedAt = ?, updatedAt = ? WHERE id = ?`,
    new Date().toISOString(),
    new Date().toISOString(),
    id
  );

  return NextResponse.json({ success: true });
}
