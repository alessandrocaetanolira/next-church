/**
 * app/api/sync/pull/route.ts
 * 
 * Rota para sincronização de dados (Pull).
 * Retorna dados modificados desde a última sincronização.
 */

import { NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";
import { hasPlanFeature } from "@/lib/access-control";

function parseSale(sale: {
  items: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  id: string;
  total: number;
  paymentMethod: string;
  orderStatus?: string | null;
  memberId: string | null;
  memberName: string | null;
  createdBy: string;
}) {
  return {
    ...sale,
    items: JSON.parse(sale.items || '[]'),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    deletedAt: sale.deletedAt?.toISOString() ?? null,
  };
}

function parseProduct(product: {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  category: string;
  active: boolean;
  availableToday: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    deletedAt: product.deletedAt?.toISOString() ?? null,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPlanFeature(session.user, 'offline_sync')) {
    return NextResponse.json({ error: "Recurso não disponível no plano" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const lastSync = searchParams.get("lastSync");
  const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

  const prisma = getTenantClient(session.user.tenantId);

  // Buscar dados modificados
  const [sales, products, members, tasks] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{
      id: string;
      total: number;
      paymentMethod: string;
      orderStatus: string | null;
      items: string;
      memberId: string | null;
      memberName: string | null;
      createdBy: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }>>(
      `
        SELECT
          id, total, paymentMethod, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
        FROM "Sale"
        WHERE updatedAt > ?
      `,
      lastSyncDate.toISOString()
    ),
    prisma.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      price: number;
      cost: number;
      stock: number;
      minStock: number;
      category: string;
      active: boolean;
      availableToday: boolean | null;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }>>(
      `
        SELECT
          id, name, description, imageUrl, price, cost, stock, minStock, category,
          active, availableToday, createdAt, updatedAt, deletedAt
        FROM "Product"
        WHERE updatedAt > ?
      `,
      lastSyncDate.toISOString()
    ),
    prisma.member.findMany({ where: { updatedAt: { gt: lastSyncDate } } }),
    prisma.task.findMany({ where: { updatedAt: { gt: lastSyncDate } } }),
  ]);

  return NextResponse.json({
    sales: sales.map(parseSale),
    products: products.map(parseProduct),
    members,
    tasks,
    timestamp: new Date().toISOString(),
  });
}
