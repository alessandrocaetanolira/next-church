"use client";

import { ReactNode, useEffect, useState } from 'react';
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
  const [layoutReady, setLayoutReady] = useState(false);

  // A largura só pode ser conhecida no cliente. Enquanto ela não foi medida,
  // mantenha um shell neutro para não montar WebTemplate e BottomNav em
  // sequência (o que causa a navegação aparecer no meio da tela durante a
  // hidratação ou ao voltar de uma aba suspensa).
  useEffect(() => setLayoutReady(true), []);

  if (!layoutReady) {
    return <div className="min-h-screen-dvh bg-background"><main>{children}</main></div>;
  }

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
