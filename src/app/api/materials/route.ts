import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';
import { generateId } from '@/lib/id';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId || !hasActionPermission(session.user, 'materials', 'view')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const materials = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT id, name, category, quantity, minQuantity, unit, createdAt, updatedAt, deletedAt
      FROM "Material"
      WHERE deletedAt IS NULL
      ORDER BY category ASC, name ASC
    `
  );

  return NextResponse.json(materials);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId || !hasAnyActionPermission(session.user, 'materials', ['create', 'manage'])) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { name, category, quantity, minQuantity, unit } = await request.json();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const now = new Date().toISOString();
  const id = generateId();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "Material" (id, name, category, quantity, minQuantity, unit, createdAt, updatedAt, deletedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    name,
    category,
    quantity ?? 0,
    minQuantity ?? 0,
    unit ?? 'unidades',
    now,
    now,
    null
  );

  return NextResponse.json({ success: true, id }, { status: 201 });
}
