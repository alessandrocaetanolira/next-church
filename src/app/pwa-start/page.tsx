'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LoadingState } from '@/components/common';
import OfflinePage from '@/app/offline/page';

/**
 * Ponto de entrada estável do PWA.
 * Deve responder 200 para os critérios de instalação do Chrome; a decisão
 * sobre dashboard ou login acontece somente depois que a sessão é carregada.
 */
export default function PwaStartPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    // Uma abertura fria offline não deve iniciar outra navegação que exige RSC.
    if (!navigator.onLine) return;
    router.replace(status === 'authenticated' ? '/' : '/auth/login');
  }, [router, status]);

  if (typeof navigator !== 'undefined' && !navigator.onLine) return <OfflinePage />;
  return <LoadingState label="Abrindo o Church App..." className="min-h-screen" />;
}
