'use client';

import { useState, useEffect } from 'react';
import { useAppSettings } from '@/components/providers/AppSettingsProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PLATFORM_ADMIN_LOGO } from '@/lib/branding/defaults';
import { AppImage } from './AppImage';
import { cn } from '@/lib/utils';

/** Logo institucional compartilhado, com variantes e cópia local por tenant. */
export function AppLogo({ className }: { className?: string }) {
  const { settings, resolveLogoSrc } = useAppSettings();
  const { user } = useAuth();
  const fallback = user?.isPlatformAdmin ? PLATFORM_ADMIN_LOGO : '/pwa-192x192.png';
  const [failed, setFailed] = useState({ light: false, dark: false });
  const light = resolveLogoSrc(settings.logoLightUrl || settings.logoUrl || fallback);
  const dark = resolveLogoSrc(settings.logoDarkUrl || settings.logoUrl || fallback);
  useEffect(() => setFailed({ light: false, dark: false }), [light, dark]);
  return <div className={cn('flex min-h-0 min-w-0 max-h-full max-w-full items-center overflow-hidden', className)}>
    <AppImage src={failed.light ? fallback : light} alt={settings.appName}
      className="block h-full min-h-0 w-full min-w-0 max-h-full max-w-full object-contain object-left dark:hidden" onError={() => setFailed((current) => ({ ...current, light: true }))} />
    <AppImage src={failed.dark ? fallback : dark} alt={settings.appName}
      className="hidden h-full min-h-0 w-full min-w-0 max-h-full max-w-full object-contain object-left dark:block" onError={() => setFailed((current) => ({ ...current, dark: true }))} />
  </div>;
}
