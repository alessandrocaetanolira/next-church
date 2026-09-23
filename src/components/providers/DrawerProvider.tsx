'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

type DrawerOptions = {
  content: ReactNode;
  contentClassName?: string;
};

type DrawerContextValue = {
  openDrawer: (options: DrawerOptions) => void;
  closeDrawer: () => void;
  isOpen: boolean;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerOptions | null>(null);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const openDrawer = useCallback((options: DrawerOptions) => setDrawer(options), []);

  const value = useMemo(
    () => ({ openDrawer, closeDrawer, isOpen: drawer !== null }),
    [closeDrawer, drawer, openDrawer],
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <Drawer open={drawer !== null} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent className={drawer?.contentClassName}>{drawer?.content}</DrawerContent>
      </Drawer>
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) throw new Error('useDrawer deve ser usado dentro de DrawerProvider.');
  return context;
}
