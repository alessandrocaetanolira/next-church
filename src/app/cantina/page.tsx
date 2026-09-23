/**
 * app/cantina/page.tsx
 * 
 * Página principal da Cantina.
 * O layout global já é fornecido pelo LayoutWrapper.
 */

"use client";

import { Suspense, useEffect } from 'react';
import { CanteenContainer } from '@/features/canteen/components/CanteenContainer';
import { useUIStore } from '@/features/ui/store';

export default function CantinaPage() {
  const setPageTitle = useUIStore((state) => state.setPageTitle);

  useEffect(() => {
    setPageTitle('Cantina');
  }, [setPageTitle]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando cantina...</div>}><CanteenContainer /></Suspense>
    </div>
  );
}
