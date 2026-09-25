"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { NotificationsProvider } from '@/components/providers/NotificationsProvider';
import { useAppSettings } from '@/components/providers/AppSettingsProvider';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { settings } = useAppSettings();
  const [authFallbackReady, setAuthFallbackReady] = useState(false);
  const [loadingLogoFailed, setLoadingLogoFailed] = useState(false);

  useEffect(() => {
    setLoadingLogoFailed(false);
  }, [settings.logoUrl]);

  useEffect(() => {
    if (!isLoading) {
      setAuthFallbackReady(false);
      return;
    }
    const timeout = window.setTimeout(() => setAuthFallbackReady(true), 2500);
    return () => window.clearTimeout(timeout);
  }, [isLoading]);

  const isAuthPage = pathname.startsWith("/auth") || pathname.startsWith("/admin/login");
  const isFullscreenGameRoute = pathname === "/games/caca-palavras";
  const hideMobileHeader = pathname.startsWith('/bible') || pathname.startsWith('/games') || pathname.startsWith('/jogos-novos') || pathname.startsWith('/members/') || pathname.startsWith('/cantina/products/');

  if (isLoading && !authFallbackReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse rounded-2xl bg-primary/10 p-4">
          <img
            src={settings.logoUrl && !loadingLogoFailed ? settings.logoUrl : '/branding/a-mesa-church/header.png'}
            alt=""
            aria-hidden="true"
            className="h-16 w-48 rounded-xl object-contain"
            onError={() => setLoadingLogoFailed(true)}
          />
        </div>
      </div>
    );
  }

  if (isAuthPage || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-background">
        {authFallbackReady && <div className="border-b border-warning/20 bg-warning/10 px-4 py-2 text-center text-xs text-muted-foreground">Modo offline: exibindo dados salvos neste dispositivo.</div>}
        {children}
        <Toaster position="top-center" />
      </main>
    );
  }

  if (isFullscreenGameRoute) {
    return (
      <main className="min-h-screen overflow-hidden bg-background overscroll-none">
        {children}
        <Toaster position="top-center" />
      </main>
    );
  }

  return (
    <AppLayout hideMobileHeader={hideMobileHeader}>
      <NotificationsProvider />
      {children}
      <Toaster position="top-center" />
    </AppLayout>
  );
}
