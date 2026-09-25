'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Erro recuperável na aplicação:', error);
  }, [error]);

  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold">Não foi possível carregar esta tela</h1>
      <p className="text-sm text-muted-foreground">Se você estiver offline, os conteúdos salvos continuam disponíveis na Bíblia.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>Tentar novamente</Button>
        <Button asChild type="button" variant="outline"><Link href="/bible">Abrir Bíblia</Link></Button>
      </div>
    </div>
  </main>;
}
