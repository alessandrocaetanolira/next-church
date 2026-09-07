"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { NotificationsProvider } from '@/components/providers/NotificationsProvider';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  const isAuthPage = pathname.startsWith("/auth");
  const isFullscreenGameRoute = pathname === "/games/caca-palavras";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-bold text-xl">✝ Church App...</div>
      </div>
    );
  }

  if (isAuthPage || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-background">
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
    <AppLayout>
      <NotificationsProvider />
      {children}
      <Toaster position="top-center" />
    </AppLayout>
  );
}
