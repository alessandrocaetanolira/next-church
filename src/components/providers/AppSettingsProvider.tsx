"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

export type ThemeVariant = 'default' | 'amber' | 'emerald' | 'violet' | 'rose' | 'slate';
export type ThemeMode = 'system' | 'light' | 'dark';
export type ViewMode = 'cards' | 'table';

interface AppSettings {
  appName: string;
  logoUrl?: string | null;
  themeVariant: ThemeVariant;
  themeMode: ThemeMode;
  viewMode: ViewMode;
  notificationsEnabled: boolean;
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
  themeVariant: 'default',
  themeMode: 'system',
  viewMode: 'cards',
  notificationsEnabled: true,
};

const SETTINGS_KEY = 'church-app-settings';

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch {
      localStorage.removeItem(SETTINGS_KEY);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

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
  }, [settings, mounted]);

  useEffect(() => {
    const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
    if (!tenantId) return;

    const loadBranding = async () => {
      try {
        const response = await fetch('/api/settings/branding', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const branding = await response.json();
        setSettings((current) => ({
          ...current,
          appName: branding.name || current.appName,
          logoUrl: branding.logoUrl ?? null,
          themeVariant: (branding.themeVariant as ThemeVariant | undefined) ?? current.themeVariant,
        }));
      } catch {
        // mantém fallback local
      }
    };

    void loadBranding();
  }, [session?.user]);

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
