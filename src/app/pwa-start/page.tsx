'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LoadingState } from '@/components/common';
import OfflinePage from '@/app/offline/page';
import { getLoginUrl } from '@/lib/login-routing';

/**
 * Ponto de entrada estável do PWA.
 * Deve responder 200 para os critérios de instalação do Chrome; a decisão
 * sobre dashboard ou login acontece somente depois que a sessão é carregada.
 */
export default function PwaStartPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    // Uma abertura fria offline não deve iniciar outra navegação que exige RSC.
    if (!navigator.onLine) return;
    const adminStart = new URLSearchParams(window.location.search).get('admin') === '1';
    let rememberedSlug: string | null = null;
    if (!adminStart && status !== 'authenticated') {
      try {
        const cookieSlug = document.cookie.split('; ').find((entry) => entry.startsWith('church-tenant-slug='))?.split('=')[1];
        rememberedSlug = cookieSlug ? decodeURIComponent(cookieSlug) : localStorage.getItem('church-last-tenant-slug');
      } catch { /* Um contexto ausente leva à página de link inválido. */ }
    }
    const target = status === 'authenticated'
      ? session?.user?.isPlatformAdmin ? '/admin' : '/'
      : adminStart ? '/admin/login' : getLoginUrl({ tenantSlug: rememberedSlug });
    router.replace(target);
  }, [router, session?.user?.isPlatformAdmin, status]);

  if (typeof navigator !== 'undefined' && !navigator.onLine) return <OfflinePage />;
  return <LoadingState label="Abrindo o Church App..." className="min-h-screen" />;
}
