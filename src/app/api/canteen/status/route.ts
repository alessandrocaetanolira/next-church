import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';
import { getCanteenStatus, setCanteenStatus } from '@/lib/server/canteen-operation';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!hasAnyActionPermission(session.user, 'canteen', ['catalog', 'view', 'operate'])) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return NextResponse.json(await getCanteenStatus(prisma));
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!hasActionPermission(session.user, 'canteen', 'operate')) {
    return NextResponse.json({ error: 'Sem permissão para abrir ou fechar a cantina' }, { status: 403 });
  }

  const body = await request.json();
  if (typeof body.isOpen !== 'boolean') {
    return NextResponse.json({ error: 'Informe isOpen como booleano' }, { status: 400 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const status = await setCanteenStatus(prisma, body.isOpen, session.user.email ?? session.user.name ?? null);
  return NextResponse.json(status);
}
