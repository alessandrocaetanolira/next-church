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
import { WebPageContainer } from '@/components/shared/web';
import { LoadingState } from '@/components/common';

export default function CantinaPage() {
  const setPageTitle = useUIStore((state) => state.setPageTitle);

  useEffect(() => {
    setPageTitle('Cantina');
  }, [setPageTitle]);

  return (
    <WebPageContainer size="wide" className="space-y-4">
      <Suspense fallback={<LoadingState label="Carregando cantina..." />}><CanteenContainer /></Suspense>
    </WebPageContainer>
  );
}
