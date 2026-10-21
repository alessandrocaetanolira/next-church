import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getPlatformAdminIconUrl, PLATFORM_ADMIN_MANIFEST } from '@/lib/branding/defaults';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Administração da plataforma de igrejas.',
  manifest: PLATFORM_ADMIN_MANIFEST,
  icons: {
    icon: ([192, 512] as const).map((size) => ({ url: getPlatformAdminIconUrl(size), sizes: `${size}x${size}`, type: 'image/png' })),
    apple: [{ url: getPlatformAdminIconUrl(192), sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Admin' },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
