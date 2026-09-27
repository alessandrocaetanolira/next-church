"use client";

import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { WebTemplate } from './templates/WebTemplate';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: ReactNode;
  hideMobileHeader?: boolean;
}

export function AppLayout({ children, hideMobileHeader = false }: AppLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen-dvh bg-background">
        {!hideMobileHeader && <Header />}
        <main className="mobile-main">
          {children}
        </main>
        <BottomNav />
      </div>
    );
  }

  return <WebTemplate>{children}</WebTemplate>;
}
