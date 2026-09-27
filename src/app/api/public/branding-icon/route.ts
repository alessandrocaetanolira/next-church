import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { NextRequest, NextResponse } from 'next/server';
import { getGlobalClient } from '@/lib/prisma-factory';
import { BrandingRepository } from '@/server/branding/branding.repository';
import { BrandingService } from '@/server/branding/branding.service';

export const dynamic = 'force-dynamic';

const FILES_ROOT = path.resolve(process.cwd(), 'files');

function safeSegment(value: string) {
  return /^[a-zA-Z0-9_-]+$/.test(value) ? value : null;
}

function sourcePath(value: string | null) {
  if (!value) return null;
  const pathname = value.split('?')[0];
  const fileMatch = /^\/api\/files\/([a-zA-Z0-9_-]+)\/(branding)\/([a-zA-Z0-9_-]+\.(?:png|jpe?g|webp|gif))$/i.exec(pathname);
  if (fileMatch) {
    const candidate = path.resolve(FILES_ROOT, fileMatch[1], fileMatch[2], fileMatch[3]);
    return candidate.startsWith(`${FILES_ROOT}${path.sep}`) ? candidate : null;
  }
  if (/^\/branding\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp|gif)$/i.test(pathname)
    || /^\/pwa-(?:192x192|512x512)\.png$/i.test(pathname)) {
    const publicRoot = path.resolve(process.cwd(), 'public');
    const candidate = path.resolve(publicRoot, pathname.slice(1));
    return candidate.startsWith(`${publicRoot}${path.sep}`) ? candidate : null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('igreja')?.trim().toLowerCase();
  const sizeParam = request.nextUrl.searchParams.get('size');
  const size = sizeParam === '512' ? 512 : sizeParam === '192' ? 192 : null;
  if (!slug || !safeSegment(slug) || !size) return new NextResponse('Ícone inválido', { status: 400 });

  const repository = new BrandingRepository(getGlobalClient());
  const row = await repository.findPublic(slug);
  if (!row?.active) return new NextResponse('Igreja não encontrada.', { status: 404 });

  const branding = new BrandingService(repository).normalize(row);
  const mobileIcon = branding.mobileIconUrl ?? branding.icon192Url ?? branding.logoUrl;
  const configuredLargeIcon = branding.icon512Url;
  const isDefaultLargeIcon = configuredLargeIcon?.includes('/branding/a-mesa-church/') || configuredLargeIcon?.includes('/pwa-');
  const source = sourcePath(size === 512 && configuredLargeIcon && !isDefaultLargeIcon ? configuredLargeIcon : mobileIcon) ?? path.join(process.cwd(), 'public', `pwa-${size}x${size}.png`);

  try {
    const output = await sharp(await readFile(source), { limitInputPixels: 40_000_000 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    return new NextResponse(output, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Ícone não encontrado.', { status: 404 });
  }
}

export async function POST() {
  return new NextResponse('Método não permitido.', { status: 405, headers: { Allow: 'GET' } });
}
