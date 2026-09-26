'use client';

import { cn } from '@/lib/utils';
import { useAppSettings } from '@/components/providers/AppSettingsProvider';
import { AppImage } from '@/components/shared';

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ label = 'Carregando...', className }: LoadingStateProps) {
  const { settings } = useAppSettings();

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground', className)}>
      <AppImage
        src={settings.logoLightUrl || settings.logoUrl || '/branding/a-mesa-church/header.png'}
        alt=""
        aria-hidden="true"
        width={192}
        height={64}
        className="h-9 w-40 object-contain object-left dark:hidden"
      />
      <AppImage
        src={settings.logoDarkUrl || settings.logoUrl || '/branding/a-mesa-church/header.png'}
        alt=""
        aria-hidden="true"
        width={192}
        height={64}
        className="hidden h-9 w-40 object-contain object-left dark:block"
      />
      <span>{label}</span>
    </div>
  );
}
