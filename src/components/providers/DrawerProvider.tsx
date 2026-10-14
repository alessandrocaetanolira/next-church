'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

type DrawerOptions = {
  content: ReactNode;
  contentClassName?: string;
  contentWrapperClassName?: string;
  /** Menus close on suspension; forms keep their state and use Vaul's keyboard handling. */
  closeOnSuspend?: boolean;
  repositionInputs?: boolean;
};

type DrawerContextValue = {
  openDrawer: (options: DrawerOptions) => void;
  closeDrawer: () => void;
  isOpen: boolean;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerOptions | null>(null);
  const [instance, setInstance] = useState(0);
  const latest = useRef(drawer);
  useLayoutEffect(() => { latest.current = drawer; }, [drawer]);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const openDrawer = useCallback((options: DrawerOptions) => {
    // Each opening has its own Vaul keyboard/height references, including replacement content.
    setInstance((value) => value + 1);
    setDrawer(options);
  }, []);

  useEffect(() => {
    const onSuspend = () => {
      if (latest.current?.closeOnSuspend) closeDrawer();
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') onSuspend(); };
    window.addEventListener('pagehide', onSuspend);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onSuspend);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [closeDrawer]);

  const value = useMemo(
    () => ({ openDrawer, closeDrawer, isOpen: drawer !== null }),
    [closeDrawer, drawer, openDrawer],
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <Drawer key={instance} open={drawer !== null} onOpenChange={(open) => !open && closeDrawer()}
        repositionInputs={drawer?.repositionInputs ?? true} preventScrollRestoration>
        <DrawerContent
          className={drawer?.contentClassName}
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
