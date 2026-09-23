import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGlobalClient } from '@/lib/prisma-factory';
import { hasActionPermission } from '@/lib/access-control';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'settings', 'view')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const prisma = getGlobalClient();

  const [church] = await prisma.$queryRawUnsafe<Array<{
    slug: string;
    name: string;
    logoUrl: string | null;
    themeVariant: string | null;
    themeMode: string | null;
  }>>(
    `
      SELECT slug, name, logoUrl, themeVariant, themeMode
      FROM "Church"
      WHERE (databaseKey = ? OR slug = ?) AND deletedAt IS NULL
      LIMIT 1
    `,
    session.user.tenantId,
    session.user.tenantSlug ?? session.user.tenantId
  );

  if (!church) {
    return NextResponse.json({ error: 'Igreja não encontrada.' }, { status: 404 });
  }

  return NextResponse.json(church);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  const role = session?.user?.role?.toUpperCase();
  if (!session?.user?.tenantId || !['ADMIN', 'PASTOR'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasActionPermission(session.user, 'settings', 'update')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const logoUrl = typeof body.logoUrl === 'string' ? body.logoUrl.trim() : '';
  const themeVariant = typeof body.themeVariant === 'string' ? body.themeVariant.trim() : 'default';

  if (!name) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
  }

  const prisma = getGlobalClient();

  await prisma.$executeRawUnsafe(
    `
      UPDATE "Church"
      SET name = ?, logoUrl = ?, themeVariant = ?, updatedAt = ?
      WHERE (databaseKey = ? OR slug = ?) AND deletedAt IS NULL
    `,
    name,
    logoUrl || null,
    themeVariant || 'default',
    new Date().toISOString(),
    session.user.tenantId,
    session.user.tenantSlug ?? session.user.tenantId
  );

  const [church] = await prisma.$queryRawUnsafe<Array<{
    slug: string;
    name: string;
    logoUrl: string | null;
    themeVariant: string | null;
    themeMode: string | null;
  }>>(
    `
      SELECT slug, name, logoUrl, themeVariant, themeMode
      FROM "Church"
      WHERE (databaseKey = ? OR slug = ?) AND deletedAt IS NULL
      LIMIT 1
    `,
    session.user.tenantId,
    session.user.tenantSlug ?? session.user.tenantId
  );

  return NextResponse.json(church);
}
