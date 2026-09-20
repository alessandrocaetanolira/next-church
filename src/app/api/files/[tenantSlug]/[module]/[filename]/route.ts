import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

const FILES_ROOT = path.resolve(process.cwd(), 'files');
const ALLOWED_MODULES = new Set(['products', 'materials', 'feed', 'branding']);
const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string; module: string; filename: string }> },
) {
  const session = await auth();
  const { tenantSlug, module, filename } = await params;
  if (!session?.user?.tenantId || session.user.tenantSlug !== tenantSlug) {
    return new NextResponse('Não autorizado', { status: 401 });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(tenantSlug) || !ALLOWED_MODULES.has(module) || !/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/.test(filename)) {
    return new NextResponse('Arquivo inválido', { status: 400 });
  }

  const directory = path.join(FILES_ROOT, tenantSlug, module);
  const filePath = path.join(directory, filename);
  if (!filePath.startsWith(`${directory}${path.sep}`)) return new NextResponse('Arquivo inválido', { status: 400 });

  try {
    const content = await readFile(filePath);
    const extension = filename.split('.').pop()?.toLowerCase() ?? '';
    return new NextResponse(content, {
      headers: { 'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream', 'Cache-Control': 'private, max-age=3600' },
    });
  } catch {
    return new NextResponse('Arquivo não encontrado', { status: 404 });
  }
}
