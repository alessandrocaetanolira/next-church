'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/common';
import { GroupForm, type GroupFormValue } from '@/features/groups/components/GroupForm';
import { getGroup } from '@/services/groups/groups-api';

export default function EditGroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [value, setValue] = useState<GroupFormValue | null>(null);
  const load = useCallback(async () => { if (!id) return; const group = await getGroup<{ name: string; description?: string; type: GroupFormValue['type']; capabilities: GroupFormValue['capabilities']; color?: string; icon?: string; members: Array<{ memberId: string; role: string }> }>(id); setValue({ name: group.name, description: group.description ?? '', type: group.type, capabilities: group.capabilities, color: group.color ?? 'primary', icon: group.icon ?? 'users', members: group.members.map((member) => ({ memberId: member.memberId, role: member.role })) }); }, [id]);
  useEffect(() => { void load(); }, [load]);
  return <PageShell size="narrow">
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold">Editar grupo</h1>
        <p className="text-sm text-muted-foreground">Atualize os dados e participantes do grupo.</p>
      </div>
      <Button type="button" variant="ghost" className="-ml-2 self-start sm:ml-0 sm:self-auto" onClick={() => router.push(`/groups/${id}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />Voltar para o grupo
      </Button>
    </div>
    {value ? <GroupForm groupId={id} initialValue={value} onSaved={() => router.push(`/groups/${id}`)} /> : <p className="text-sm text-muted-foreground">Carregando grupo...</p>}
  </PageShell>;
}
