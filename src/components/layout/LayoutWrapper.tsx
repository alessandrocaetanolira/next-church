"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState } from '@/components/common';
import { Toaster } from "@/components/ui/sonner";
import { NotificationsProvider } from '@/components/providers/NotificationsProvider';
import { getMobileBackTarget } from './mobile-route-chrome';

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

  useEffect(() => {
    const recoverInteraction = () => {
      if (document.visibilityState !== 'visible') return;
      // Radix/Vaul registram o Escape no document para liberar foco e scroll.
      // Em PWAs suspensas, o evento de fechamento pode ser perdido durante o
      // congelamento da aba e deixar um overlay invisível bloqueando cliques.
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        bubbles: true,
      }));
    };

    document.addEventListener('visibilitychange', recoverInteraction);
    window.addEventListener('pageshow', recoverInteraction);
    return () => {
      document.removeEventListener('visibilitychange', recoverInteraction);
      window.removeEventListener('pageshow', recoverInteraction);
    };
  }, []);

  const isAuthPage = pathname.startsWith("/auth") || pathname.startsWith("/admin/login");
  const isFullscreenGameRoute = pathname === "/games/caca-palavras";
  // O perfil social já possui um cabeçalho próprio sobre a capa, incluindo o
  // retorno contextual. Montar o Header global duplicaria a navegação.
  const hideMobileHeader = pathname.startsWith('/bible') || pathname.startsWith('/games') || pathname.startsWith('/jogos-novos') || pathname.startsWith('/perfil/');
  const hideMobileBottomNav = Boolean(getMobileBackTarget(pathname));

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
    <AppLayout hideMobileHeader={hideMobileHeader} hideMobileBottomNav={hideMobileBottomNav}>
      <NotificationsProvider />
      {children}
      <Toaster position="top-center" />
    </AppLayout>
  );
}
