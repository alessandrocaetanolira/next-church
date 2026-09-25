'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MemberFormCreate } from '@/components/forms/MemberFormCreate';
import { PageShell } from '@/components/common';

export default function NewMemberPage() {
  const router = useRouter();

  return (
    <PageShell>
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Button type="button" variant="ghost" size="icon" aria-label="Voltar para membros" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Novo membro</h1>
          <p className="text-sm text-muted-foreground">Cadastre os dados do membro da igreja.</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl">
        <MemberFormCreate onSuccess={() => router.replace('/members')} />
      </div>
    </PageShell>
  );
}
