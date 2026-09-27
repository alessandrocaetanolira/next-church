'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingState, PageShell } from '@/components/common';
import { MemberFormEdit } from '@/components/forms/MemberFormEdit';
import { getMember } from '@/services/members/members-api';
import type { ManagedMember } from '@/features/members/components/member-display';
import { toast } from 'sonner';

export default function EditMemberPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<ManagedMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    void getMember<ManagedMember>(params.id).then(setMember).catch(() => toast.error('Erro ao carregar membro.')).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingState className="min-h-[60vh]" label="Carregando membro..." />;
  if (!member) return <PageShell><p className="py-10 text-center text-muted-foreground">Membro não encontrado.</p></PageShell>;

  return (
    <PageShell size="narrow">
      <div className="border-b border-border pb-4">
        <div><h1 className="text-xl font-semibold">Editar membro</h1><p className="text-sm text-muted-foreground">Atualize os dados de {member.name}.</p></div>
      </div>
      <MemberFormEdit member={member} onSuccess={() => router.replace(`/members/${member.id}`)} />
    </PageShell>
  );
}
