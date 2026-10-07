"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { WebTemplate } from './templates/WebTemplate';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: ReactNode;
  hideMobileHeader?: boolean;
  hideMobileBottomNav?: boolean;
}

export function AppLayout({ children, hideMobileHeader = false, hideMobileBottomNav = false }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [layoutReady, setLayoutReady] = useState(false);

  // A largura só pode ser conhecida no cliente. Enquanto ela não foi medida,
  // mantenha um shell neutro para não montar WebTemplate e BottomNav em
  // sequência (o que causa a navegação aparecer no meio da tela durante a
  // hidratação ou ao voltar de uma aba suspensa).
  useEffect(() => setLayoutReady(true), []);

  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    let stableViewportHeight = viewport?.height ?? window.innerHeight;

    const updateViewportHeight = () => {
      const height = viewport?.height ?? window.innerHeight;
      // O teclado reduz o visual viewport, mas não deve redimensionar o shell
      // do app: isso faria a BottomNav subir para o meio da tela. Mantemos a
      // última altura estável e recalculamos somente quando o teclado fecha ou
      // quando o viewport realmente muda (orientação/barras do navegador).
      const keyboardIsOpen = height < stableViewportHeight - 120;
      if (keyboardIsOpen) return;

      stableViewportHeight = height;
      document.documentElement.style.setProperty('--app-viewport-height', `${height}px`);
    };

    updateViewportHeight();
    viewport?.addEventListener('resize', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('pageshow', updateViewportHeight);
    document.addEventListener('visibilitychange', updateViewportHeight);

    return () => {
      viewport?.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('pageshow', updateViewportHeight);
      document.removeEventListener('visibilitychange', updateViewportHeight);
      document.documentElement.style.removeProperty('--app-viewport-height');
    };
  }, [isMobile]);

  if (!layoutReady) {
    return <div className="mobile-shell bg-background"><main className="mobile-main">{children}</main></div>;
  }

  if (isMobile) {
    return (
      <div className="mobile-shell bg-background">
        {!hideMobileHeader && <Header />}
        <main className={`mobile-main${hideMobileBottomNav ? ' mobile-main--without-bottom-nav' : ''}`}>
          {children}
        </main>
        {!hideMobileBottomNav && <BottomNav />}
      </div>
    );
  }

  return <WebTemplate>{children}</WebTemplate>;
}
