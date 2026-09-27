import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGlobalClient } from '@/lib/prisma-factory';

const FILES_ROOT = path.resolve(process.cwd(), 'files');
const ALLOWED_MODULES = new Set(['products', 'materials', 'feed', 'branding', 'profile']);
const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string; module: string; filename: string }> },
) {
  const { tenantSlug, module, filename } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(tenantSlug) || !ALLOWED_MODULES.has(module) || !/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/.test(filename)) {
    return new NextResponse('Arquivo inválido', { status: 400 });
  }

  const church = await getGlobalClient().church.findFirst({
    where: { OR: [{ slug: tenantSlug }, { databaseKey: tenantSlug }], deletedAt: null },
    select: { id: true, slug: true, databaseKey: true, active: true },
  });
  const isPublicBranding = module === 'branding' && church?.active;

  // Branding precisa funcionar antes do login para renderizar o tenant e o PWA.
  // Os demais arquivos continuam protegidos pela sessão do tenant.
  const session = isPublicBranding ? null : await auth();
  if (!isPublicBranding && (!session?.user?.tenantId || (session.user.tenantSlug !== tenantSlug && session.user.tenantId !== tenantSlug))) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const directory = path.join(FILES_ROOT, tenantSlug, module);
  const filePath = path.join(directory, filename);
  if (!filePath.startsWith(`${directory}${path.sep}`)) return new NextResponse('Arquivo inválido', { status: 400 });

  try {
    const content = await readFile(filePath);
    const extension = filename.split('.').pop()?.toLowerCase() ?? '';
    return new NextResponse(content, {
      headers: {
        'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
        'Cache-Control': isPublicBranding ? 'public, max-age=31536000, immutable' : 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Arquivo não encontrado', { status: 404 });
  }
}
