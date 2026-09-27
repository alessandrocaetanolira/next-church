"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from '@/components/common';
import { Toaster } from "@/components/ui/sonner";
import { NotificationsProvider } from '@/components/providers/NotificationsProvider';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const [authFallbackReady, setAuthFallbackReady] = useState(false);

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
  const hideMobileHeader = pathname.startsWith('/bible') || pathname.startsWith('/games') || pathname.startsWith('/jogos-novos');

  if (isLoading && !authFallbackReady) {
    return <LoadingState label="Carregando aplicação..." className="min-h-screen bg-background" />;
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
