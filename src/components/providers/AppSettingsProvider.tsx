"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { getUserBranding } from '@/services/settings/settings-api';

export type ThemeVariant = 'default' | 'amber' | 'emerald' | 'violet' | 'rose' | 'slate';
export type ThemeMode = 'system' | 'light' | 'dark';
export type ViewMode = 'cards' | 'table';

interface AppSettings {
  appName: string;
  logoUrl?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  mobileIconUrl?: string | null;
  sidebarLogoUrl?: string | null;
  sidebarOpenLightUrl?: string | null;
  sidebarOpenDarkUrl?: string | null;
  sidebarCollapsedLightUrl?: string | null;
  sidebarCollapsedDarkUrl?: string | null;
  sidebarUseImage: boolean;
  sidebarTitle?: string | null;
  sidebarSubtitle?: string | null;
  themeVariant: ThemeVariant;
  themeMode: ThemeMode;
  viewMode: ViewMode;
  notificationsEnabled: boolean;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setAppName: (name: string) => void;
  setThemeVariant: (variant: ThemeVariant) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleThemeMode: () => void;
}

const defaultSettings: AppSettings = {
  appName: 'Church App',
  logoUrl: null,
  logoLightUrl: null,
  logoDarkUrl: null,
  mobileIconUrl: null,
  sidebarLogoUrl: null,
  sidebarOpenLightUrl: null,
  sidebarOpenDarkUrl: null,
  sidebarCollapsedLightUrl: null,
  sidebarCollapsedDarkUrl: null,
  sidebarUseImage: true,
  sidebarTitle: 'Church App',
  sidebarSubtitle: 'Gestão de Tarefas',
  themeVariant: 'default',
  themeMode: 'system',
  viewMode: 'cards',
  notificationsEnabled: true,
  primaryColor: null,
  secondaryColor: null,
};

function hexToHsl(value?: string | null) {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return null;
  const n = Number.parseInt(value.slice(1), 16);
  const r = ((n >> 16) & 255) / 255; const g = ((n >> 8) & 255) / 255; const b = (n & 255) / 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const delta = max - min; let h = 0;
  const l = (max + min) / 2; const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  if (delta) h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  h = Math.round(h * 60); if (h < 0) h += 360;
  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function themedSurfaceColor(value: string, dark: boolean) {
  const hsl = hexToHsl(value);
  if (!hsl) return null;
  const [hue, saturation] = hsl.split(' ');
  // A cor secundária é usada como superfície de badges, chips e estados
  // neutros. Nunca usamos a cor bruta do tenant como fundo para preservar
  // contraste no tema claro e evitar superfícies quase pretas no dark.
  return `${hue} ${Math.min(Number.parseInt(saturation, 10), 62)}% ${dark ? 18 : 94}%`;
}

function isUsableBrandColor(value?: string | null) {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return false;
  const n = Number.parseInt(value.slice(1), 16);
  const r = ((n >> 16) & 255) / 255; const g = ((n >> 8) & 255) / 255; const b = (n & 255) / 255;
  // Evita que uma configuração de tenant transforme ações globais em preto
  // ou em uma cor quase preta, especialmente no tema claro.
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance >= 0.16 && luminance <= 0.94;
}

const SETTINGS_KEY = 'church-app-settings';

function settingsStorageKey(tenantKey?: string | null) {
  return tenantKey ? `${SETTINGS_KEY}:${tenantKey}` : `${SETTINGS_KEY}:default`;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const tenantKey = (session?.user as { tenantSlug?: string; tenantId?: string } | undefined)?.tenantSlug
    || (session?.user as { tenantId?: string } | undefined)?.tenantId
    || null;
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(settingsStorageKey(tenantKey));
      setSettings(stored ? { ...defaultSettings, ...JSON.parse(stored) } : { ...defaultSettings });
    } catch {
      localStorage.removeItem(settingsStorageKey(tenantKey));
      setSettings({ ...defaultSettings });
    }
  }, [tenantKey]);

  useEffect(() => {
    if (!mounted) return;
    
    localStorage.setItem(settingsStorageKey(tenantKey), JSON.stringify(settings));

    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const useDark = settings.themeMode === 'dark' || (settings.themeMode === 'system' && mediaQuery.matches);
      if (useDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      if (settings.themeVariant === 'default') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', settings.themeVariant);
      }
      const primary = isUsableBrandColor(settings.primaryColor) ? hexToHsl(settings.primaryColor) : null;
      const secondary = isUsableBrandColor(settings.secondaryColor)
        ? themedSurfaceColor(settings.secondaryColor!, useDark)
        : null;
      if (primary) root.style.setProperty('--primary', primary); else root.style.removeProperty('--primary');
      if (secondary) {
        root.style.setProperty('--secondary', secondary);
        root.style.setProperty('--secondary-foreground', useDark ? '213 31% 91%' : '220 13% 18%');
      } else {
        root.style.removeProperty('--secondary');
        root.style.removeProperty('--secondary-foreground');
      }
    };

    applyTheme();

    const handleChange = () => {
      if (settings.themeMode === 'system') {
        applyTheme();
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [settings, mounted, tenantKey]);

  useEffect(() => {
    const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
    if (!tenantId || !tenantKey) return;
    document.cookie = `church-tenant-slug=${encodeURIComponent(tenantKey)}; Path=/; Max-Age=31536000; SameSite=Lax`;

    const loadBranding = async () => {
      try {
        const branding = await getUserBranding();
        setSettings((current) => ({
          ...current,
          appName: branding.pwaName || branding.name || current.appName,
          logoUrl: branding.logoUrl ?? null,
          logoLightUrl: branding.logoLightUrl ?? branding.logoUrl ?? null,
          logoDarkUrl: branding.logoDarkUrl ?? branding.logoUrl ?? null,
          mobileIconUrl: branding.mobileIconUrl ?? null,
          sidebarLogoUrl: branding.sidebarLogoUrl ?? branding.logoUrl ?? null,
          sidebarOpenLightUrl: branding.sidebarOpenLightUrl ?? branding.logoLightUrl ?? branding.logoUrl ?? null,
          sidebarOpenDarkUrl: branding.sidebarOpenDarkUrl ?? branding.logoDarkUrl ?? branding.logoUrl ?? null,
          sidebarCollapsedLightUrl: branding.sidebarCollapsedLightUrl ?? branding.logoLightUrl ?? branding.logoUrl ?? null,
          sidebarCollapsedDarkUrl: branding.sidebarCollapsedDarkUrl ?? branding.logoDarkUrl ?? branding.logoUrl ?? null,
          sidebarUseImage: branding.sidebarUseImage ?? true,
          sidebarTitle: branding.sidebarTitle,
          sidebarSubtitle: branding.sidebarSubtitle,
          themeVariant: (branding.themeVariant as ThemeVariant | undefined) ?? current.themeVariant,
          primaryColor: branding.primaryColor ?? null,
          secondaryColor: branding.secondaryColor ?? null,
        }));
      } catch {
        // mantém fallback local
      }
    };

    void loadBranding();
  }, [session?.user, tenantKey]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const setAppName = (name: string) => updateSettings({ appName: name });
  const setThemeVariant = (variant: ThemeVariant) => updateSettings({ themeVariant: variant });
  const setThemeMode = (mode: ThemeMode) => updateSettings({ themeMode: mode });
  const setViewMode = (mode: ViewMode) => updateSettings({ viewMode: mode });
  const toggleThemeMode = () =>
    updateSettings({ themeMode: settings.themeMode === 'dark' ? 'light' : 'dark' });

  return (
    <AppSettingsContext.Provider value={{
      settings,
      updateSettings,
      setAppName,
      setThemeVariant,
      setThemeMode,
      setViewMode,
      toggleThemeMode,
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
