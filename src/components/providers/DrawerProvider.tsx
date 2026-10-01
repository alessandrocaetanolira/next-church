'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

type DrawerOptions = {
  content: ReactNode;
  contentClassName?: string;
  contentWrapperClassName?: string;
};

type DrawerContextValue = {
  openDrawer: (options: DrawerOptions) => void;
  closeDrawer: () => void;
  isOpen: boolean;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerOptions | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const openDrawer = useCallback((options: DrawerOptions) => setDrawer(options), []);

  useEffect(() => {
    if (!drawer || typeof window === 'undefined' || !window.visualViewport) {
      setKeyboardInset(0);
      return;
    }

    const viewport = window.visualViewport;
    const updateKeyboardInset = () => {
      setKeyboardInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    };

    updateKeyboardInset();
    viewport.addEventListener('resize', updateKeyboardInset);
    viewport.addEventListener('scroll', updateKeyboardInset);
    return () => {
      viewport.removeEventListener('resize', updateKeyboardInset);
      viewport.removeEventListener('scroll', updateKeyboardInset);
    };
  }, [drawer]);

  const value = useMemo(
    () => ({ openDrawer, closeDrawer, isOpen: drawer !== null }),
    [closeDrawer, drawer, openDrawer],
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <Drawer open={drawer !== null} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent
          className={drawer?.contentClassName}
          style={{
            bottom: keyboardInset ? `${keyboardInset}px` : undefined,
            maxHeight: keyboardInset ? `calc(82dvh - ${keyboardInset}px)` : undefined,
          }}
        >
          <div className={drawer?.contentWrapperClassName ?? "min-h-0 overflow-y-auto overscroll-contain pb-[max(0.5rem,env(safe-area-inset-bottom))]"}>
            {drawer?.content}
          </div>
        </DrawerContent>
      </Drawer>
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) throw new Error('useDrawer deve ser usado dentro de DrawerProvider.');
  return context;
}
