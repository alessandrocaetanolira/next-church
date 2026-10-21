import type { MetadataRoute } from 'next';
import { NextResponse } from 'next/server';
import { getPlatformAdminIconUrl } from '@/lib/branding/defaults';

export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: '/pwa-start',
    name: 'Admin',
    short_name: 'Admin',
    description: 'Administração da plataforma de igrejas.',
    start_url: '/pwa-start?admin=1',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: '#111827',
    theme_color: '#111827',
    lang: 'pt-BR',
    icons: ([192, 512] as const).map((size) => ({
      src: getPlatformAdminIconUrl(size),
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any' as const,
    })),
  };
  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' },
  });
}
