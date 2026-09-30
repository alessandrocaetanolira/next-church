'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAppSettings, type ThemeVariant } from '@/components/providers/AppSettingsProvider';
import { getUserBranding, updateUserBranding } from '@/services/settings/settings-api';

export type BrandingImageField = 'mobileIconUrl' | 'sidebarOpenLightUrl' | 'sidebarOpenDarkUrl' | 'sidebarCollapsedLightUrl' | 'sidebarCollapsedDarkUrl';

export function useSettingsBranding() {
  const { data: session } = useSession();
  const { settings, updateSettings } = useAppSettings();
  const [branding, setBranding] = useState({
    name: settings.appName,
    logoLightUrl: settings.logoLightUrl ?? settings.logoUrl ?? '',
    logoDarkUrl: settings.logoDarkUrl ?? settings.logoUrl ?? '',
    mobileIconUrl: settings.mobileIconUrl ?? '',
    sidebarLogoUrl: settings.sidebarLogoUrl ?? settings.logoLightUrl ?? settings.logoUrl ?? '',
    sidebarOpenLightUrl: settings.sidebarOpenLightUrl ?? settings.logoLightUrl ?? settings.logoUrl ?? '',
    sidebarOpenDarkUrl: settings.sidebarOpenDarkUrl ?? settings.logoDarkUrl ?? settings.logoUrl ?? '',
    sidebarCollapsedLightUrl: settings.sidebarCollapsedLightUrl ?? settings.logoLightUrl ?? settings.logoUrl ?? '',
    sidebarCollapsedDarkUrl: settings.sidebarCollapsedDarkUrl ?? settings.logoDarkUrl ?? settings.logoUrl ?? '',
    sidebarUseImage: settings.sidebarUseImage,
    sidebarTitle: settings.sidebarTitle ?? settings.appName,
    sidebarSubtitle: settings.sidebarSubtitle ?? 'Gestão de Tarefas',
    themeVariant: settings.themeVariant,
  });
  const [savingBranding, setSavingBranding] = useState(false);

  useEffect(() => {
    const loadBranding = async () => {
      if (!session?.user) return;
      try {
        const payload = await getUserBranding();
        setBranding({
          name: payload.name ?? settings.appName,
          logoLightUrl: payload.logoLightUrl ?? payload.logoUrl ?? '',
          logoDarkUrl: payload.logoDarkUrl ?? payload.logoUrl ?? '',
          mobileIconUrl: payload.mobileIconUrl ?? '',
          sidebarLogoUrl: payload.sidebarLogoUrl ?? payload.logoLightUrl ?? payload.logoUrl ?? '',
          sidebarOpenLightUrl: payload.sidebarOpenLightUrl ?? payload.logoLightUrl ?? payload.logoUrl ?? '',
          sidebarOpenDarkUrl: payload.sidebarOpenDarkUrl ?? payload.logoDarkUrl ?? payload.logoUrl ?? '',
          sidebarCollapsedLightUrl: payload.sidebarCollapsedLightUrl ?? payload.logoLightUrl ?? payload.logoUrl ?? '',
          sidebarCollapsedDarkUrl: payload.sidebarCollapsedDarkUrl ?? payload.logoDarkUrl ?? payload.logoUrl ?? '',
          sidebarUseImage: payload.sidebarUseImage ?? true,
          sidebarTitle: payload.sidebarTitle ?? '',
          sidebarSubtitle: payload.sidebarSubtitle ?? '',
          themeVariant: (payload.themeVariant as ThemeVariant | undefined) ?? settings.themeVariant,
        });
      } catch {
        // Mantém o branding carregado pelo provider como fallback.
      }
    };
    void loadBranding();
  }, [session?.user, settings.appName, settings.logoUrl, settings.logoLightUrl, settings.logoDarkUrl, settings.mobileIconUrl, settings.sidebarLogoUrl, settings.sidebarOpenLightUrl, settings.sidebarOpenDarkUrl, settings.sidebarCollapsedLightUrl, settings.sidebarCollapsedDarkUrl, settings.sidebarUseImage, settings.sidebarTitle, settings.sidebarSubtitle, settings.themeVariant]);

  const saveBranding = async () => {
    setSavingBranding(true);
    try {
      const base64 = (value: string) => value === '' ? null : value.startsWith('data:') ? value : undefined;
      const payload = await updateUserBranding({
        name: branding.name,
        themeVariant: branding.themeVariant,
        logoLightBase64: base64(branding.logoLightUrl),
        logoDarkBase64: base64(branding.logoDarkUrl),
        mobileIconBase64: base64(branding.mobileIconUrl),
        sidebarLogoBase64: base64(branding.sidebarLogoUrl),
        sidebarOpenLightBase64: base64(branding.sidebarOpenLightUrl),
        sidebarOpenDarkBase64: base64(branding.sidebarOpenDarkUrl),
        sidebarCollapsedLightBase64: base64(branding.sidebarCollapsedLightUrl),
        sidebarCollapsedDarkBase64: base64(branding.sidebarCollapsedDarkUrl),
        sidebarUseImage: branding.sidebarUseImage,
        sidebarTitle: branding.sidebarTitle.trim() || null,
        sidebarSubtitle: branding.sidebarSubtitle.trim() || null,
      });
      updateSettings({
        appName: payload.name ?? branding.name,
        logoUrl: payload.logoUrl ?? null,
        logoLightUrl: payload.logoLightUrl ?? payload.logoUrl ?? null,
        logoDarkUrl: payload.logoDarkUrl ?? payload.logoUrl ?? null,
        mobileIconUrl: payload.mobileIconUrl ?? null,
        sidebarLogoUrl: payload.sidebarLogoUrl ?? null,
        sidebarOpenLightUrl: payload.sidebarOpenLightUrl ?? null,
        sidebarOpenDarkUrl: payload.sidebarOpenDarkUrl ?? null,
        sidebarCollapsedLightUrl: payload.sidebarCollapsedLightUrl ?? null,
        sidebarCollapsedDarkUrl: payload.sidebarCollapsedDarkUrl ?? null,
        sidebarUseImage: payload.sidebarUseImage ?? true,
        sidebarTitle: payload.sidebarTitle,
        sidebarSubtitle: payload.sidebarSubtitle,
        themeVariant: (payload.themeVariant as ThemeVariant | undefined) ?? settings.themeVariant,
      });
      return payload;
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoUpload = (field: BrandingImageField, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setBranding((current) => ({ ...current, [field]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  return { session, settings, updateSettings, branding, setBranding, savingBranding, saveBranding, handleLogoUpload };
}
