import { NextRequest, NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";
import { hasActionPermission } from "@/lib/access-control";

/**
 * Endpoint de Sincronização Unificada (Push/Pull)
 * 
 * GET /api/sync?since=TIMESTAMP: Puxa todas as mudanças do servidor desde o timestamp.
 * POST /api/sync: Empurra mudanças locais para o servidor.
 */

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const tenantId = (session.user as any).tenantId;
  if (!hasActionPermission(session.user, 'tasks', 'view')) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const prisma = getTenantClient(tenantId);

  const since = req.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : new Date(0);

  try {
    // Busca alterações recentes em todas as tabelas principais
    const [sales, tasks, members, products] = await Promise.all([
      prisma.sale.findMany({ where: { updatedAt: { gt: sinceDate } } }),
      prisma.task.findMany({ where: { updatedAt: { gt: sinceDate } } }),
      prisma.member.findMany({ where: { updatedAt: { gt: sinceDate } } }),
      prisma.product.findMany({ where: { updatedAt: { gt: sinceDate } } }),
    ]);

    return NextResponse.json({ sales, tasks, members, products, timestamp: new Date().toISOString() });
  } catch (error) {
    return new NextResponse("Error fetching sync data", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const tenantId = (session.user as any).tenantId;
  if (!hasActionPermission(session.user, 'tasks', 'create') && !hasActionPermission(session.user, 'tasks', 'update')) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const prisma = getTenantClient(tenantId);

  const body = await req.json();
  const { sales, tasks, members, products } = body;

  try {
    // Aplica alterações (Upsert para garantir integridade)
    await prisma.$transaction(async (tx: any) => {
      if (sales) for (const sale of sales) await tx.sale.upsert({ where: { id: sale.id }, update: sale, create: sale });
      if (tasks) for (const task of tasks) await tx.task.upsert({ where: { id: task.id }, update: task, create: task });
      if (members) for (const member of members) await tx.member.upsert({ where: { id: member.id }, update: member, create: member });
      if (products) for (const product of products) await tx.product.upsert({ where: { id: product.id }, update: product, create: product });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse("Error applying sync data", { status: 500 });
  }
}
