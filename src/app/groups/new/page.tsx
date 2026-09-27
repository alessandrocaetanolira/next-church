'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/common';
import { GroupForm } from '@/features/groups/components/GroupForm';

export default function NewGroupPage() {
  const router = useRouter();
  return <PageShell size="narrow">
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold">Novo grupo</h1>
        <p className="text-sm text-muted-foreground">Cadastre o grupo e seus participantes.</p>
      </div>
      <Button type="button" variant="ghost" className="-ml-2 self-start sm:ml-0 sm:self-auto" onClick={() => router.push('/groups')}>
        <ArrowLeft className="mr-2 h-4 w-4" />Voltar para grupos
      </Button>
    </div>
    <GroupForm onSaved={() => router.push('/groups')} />
  </PageShell>;
}
