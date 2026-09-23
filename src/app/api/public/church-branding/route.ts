import { NextRequest, NextResponse } from 'next/server';
import { getGlobalClient } from '@/lib/prisma-factory';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('igreja')?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: 'Igreja não informada.' }, { status: 400 });
  }

  const prisma = getGlobalClient();

  const [church] = await prisma.$queryRawUnsafe<Array<{
    slug: string;
    name: string;
    logoUrl: string | null;
    themeVariant: string | null;
    themeMode: string | null;
    active: boolean;
  }>>(
    `
      SELECT slug, name, logoUrl, themeVariant, themeMode, active
      FROM "Church"
      WHERE slug = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    slug
  );

  if (!church || !church.active) {
    return NextResponse.json({ error: 'Igreja não encontrada.' }, { status: 404 });
  }

  return NextResponse.json({
    slug: church.slug,
    name: church.name,
    logoUrl: church.logoUrl ?? null,
    themeVariant: church.themeVariant ?? 'default',
    themeMode: church.themeMode ?? 'light',
  });
}
