'use client';

import { useRouter } from 'next/navigation';
import { MemberFormCreate } from '@/components/forms/MemberFormCreate';
import { PageShell } from '@/components/common';

export default function NewMemberPage() {
  const router = useRouter();

  return (
    <PageShell>
      <div className="border-b border-border pb-4">
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
