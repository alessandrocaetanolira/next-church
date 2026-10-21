import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { NextRequest, NextResponse } from 'next/server';
import { PLATFORM_ADMIN_LOGO } from '@/lib/branding/defaults';

export async function GET(request: NextRequest) {
  const sizeParam = request.nextUrl.searchParams.get('size');
  const size = sizeParam === '192' ? 192 : sizeParam === '512' ? 512 : null;
  if (!size) return new NextResponse('Tamanho inválido', { status: 400 });

  try {
    const source = await readFile(path.join(process.cwd(), 'public', PLATFORM_ADMIN_LOGO.slice(1)));
    const output = await sharp(source)
      .resize(size, size, { fit: 'contain', background: '#111827' })
      .png()
      .toBuffer();
    return new NextResponse(output, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Não foi possível gerar o ícone do admin.', error);
    return new NextResponse('Não foi possível gerar o ícone.', { status: 500 });
  }
}
