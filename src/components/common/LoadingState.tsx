'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppSettings } from '@/components/providers/AppSettingsProvider';
import { AppImage } from '@/components/shared';

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ label = 'Carregando...', className }: LoadingStateProps) {
  const { settings } = useAppSettings();
  const [logoReady, setLogoReady] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const logoSrc = isDark
    ? (settings.logoDarkUrl || settings.logoUrl || settings.logoLightUrl)
    : (settings.logoLightUrl || settings.logoUrl || settings.logoDarkUrl);

  useEffect(() => {
    setLogoReady(false);
    setLogoFailed(false);
  }, [logoSrc]);

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground', className)}>
      <div className="relative flex h-16 w-40 items-center justify-center">
        {logoSrc && !logoFailed ? (
          <AppImage
            src={logoSrc}
            alt=""
            aria-hidden="true"
            width={192}
            height={64}
            className={cn('h-12 w-36 object-contain transition-opacity', logoReady ? 'animate-pulse opacity-100' : 'opacity-0')}
            onLoad={() => setLogoReady(true)}
            onError={() => { setLogoFailed(true); setLogoReady(false); }}
          />
        ) : null}
        {!logoReady && <Loader2 className="absolute h-8 w-8 animate-spin text-primary" aria-hidden="true" />}
      </div>
      <span>{label}</span>
    </div>
  );
}
