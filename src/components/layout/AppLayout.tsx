"use client";

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationBell } from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { LogOut, Monitor, Sun, Moon } from 'lucide-react';

import { useUIStore } from '@/features/ui/store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAppSettings } from '@/components/providers/AppSettingsProvider';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  hideMobileHeader?: boolean;
}

export function AppLayout({ children, title: propTitle, hideMobileHeader = false }: AppLayoutProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { settings, updateSettings } = useAppSettings();
  const pageTitle = useUIStore((state) => state.pageTitle);
  const title = propTitle || pageTitle;

  const isMember = user?.role === 'MEMBER';
  const handleCycleThemeMode = () => {
    const nextMode =
      settings.themeMode === 'system'
        ? 'light'
        : settings.themeMode === 'light'
          ? 'dark'
          : 'system';
    updateSettings({ themeMode: nextMode });
  };
  const themeButton = {
    system: { label: 'Sistema', icon: Monitor },
    light: { label: 'Claro', icon: Sun },
    dark: { label: 'Escuro', icon: Moon },
  }[settings.themeMode];
  const ThemeIcon = themeButton.icon;

  if (isMobile) {
    return (
      <div className="min-h-screen-dvh bg-background">
        {!hideMobileHeader && <Header title={title} />}
        <main className="pb-20 safe-bottom">
          <div key={pathname} className="animate__animated animate__flipInY">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary">
                {settings.logoUrl ? <img src={settings.logoUrl} alt={settings.appName} className="h-full w-full object-contain" /> : <span className="text-sm font-bold text-primary-foreground">✝</span>}
              </div>
              <h1 className="font-semibold text-foreground">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {isMember && (
                <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={handleCycleThemeMode}>
                  <ThemeIcon className="h-3.5 w-3.5" />
                  <span>{themeButton.label}</span>
                </Button>
              )}
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/auth/login' })}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div key={pathname} className="animate__animated animate__flipInY">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
