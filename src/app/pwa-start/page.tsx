'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LoadingState } from '@/components/common';

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
    router.replace(status === 'authenticated' ? '/' : '/auth/login');
  }, [router, status]);

  return <LoadingState label="Abrindo o Church App..." className="min-h-screen" />;
}
