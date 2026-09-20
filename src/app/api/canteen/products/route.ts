import { NextRequest, NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';
import { saveTenantDataUrl } from '@/lib/server/tenant-file-storage';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasAnyActionPermission(session.user, 'canteen', ['catalog', 'view'])) return new NextResponse("Forbidden", { status: 403 });
  
  const tenantId = (session.user as any).tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const products = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT
        id, name, description, imageUrl, price, cost, stock, minStock, category,
        active, availableToday, createdAt, updatedAt, deletedAt
      FROM "Product"
      WHERE deletedAt IS NULL
      ORDER BY name ASC
    `
  );
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !hasActionPermission(session.user, 'canteen', 'manage_products') || !['ADMIN', 'PASTOR', 'CANTEEN'].includes((session.user as any).role))
    return new NextResponse("Forbidden", { status: 403 });

  const tenantId = (session.user as any).tenantId;
  const tenantSlug = (session.user as any).tenantSlug ?? tenantId;
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const data = await req.json();
  let imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : null;
  if (imageUrl?.startsWith('data:image/')) {
    imageUrl = await saveTenantDataUrl(tenantSlug, 'products', imageUrl);
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      cost: data.cost,
      stock: data.stock,
      minStock: data.minStock,
      category: data.category,
      active: data.active ?? true,
    },
  });

  await prisma.$executeRawUnsafe(
    `UPDATE "Product" SET "availableToday" = ?, "imageUrl" = ?, "updatedAt" = ? WHERE id = ?`,
    data.availableToday !== false,
    imageUrl,
    new Date().toISOString(),
    product.id
  );

  const createdProduct = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `
      SELECT
        id, name, description, imageUrl, price, cost, stock, minStock, category,
        active, availableToday, createdAt, updatedAt, deletedAt
      FROM "Product"
      WHERE id = ?
      LIMIT 1
    `,
    product.id
  );
  return NextResponse.json(createdProduct[0], { status: 201 });
}
