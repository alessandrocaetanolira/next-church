/**
 * api/canteen/products/[id]/route.ts
 * 
 * Gerenciamento individual de produto.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const data = await request.json();
  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const { id } = await params;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(typeof data.name === 'string' ? { name: data.name } : {}),
        ...(typeof data.description === 'string' ? { description: data.description } : {}),
        ...(typeof data.price === 'number' ? { price: data.price } : {}),
        ...(typeof data.cost === 'number' ? { cost: data.cost } : {}),
        ...(typeof data.stock === 'number' ? { stock: data.stock } : {}),
        ...(typeof data.minStock === 'number' ? { minStock: data.minStock } : {}),
        ...(typeof data.category === 'string' ? { category: data.category } : {}),
        ...(typeof data.active === 'boolean' ? { active: data.active } : {}),
        updatedAt: new Date(),
      },
    });

    if (typeof data.availableToday === 'boolean') {
      await prisma.$executeRawUnsafe(
        `UPDATE "Product" SET "availableToday" = ?, "updatedAt" = ? WHERE id = ?`,
        data.availableToday,
        new Date().toISOString(),
        id
      );
    }

    if (typeof data.imageUrl === 'string' || data.imageUrl === null) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Product" SET "imageUrl" = ?, "updatedAt" = ? WHERE id = ?`,
        data.imageUrl,
        new Date().toISOString(),
        id
      );
    }

    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);
  const { id } = await params;

  try {
    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 });
  }
}
