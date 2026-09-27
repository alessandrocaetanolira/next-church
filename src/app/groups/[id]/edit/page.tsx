'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebPageLayout } from '@/components/shared/web';
import { GroupForm, type GroupFormValue } from '@/features/groups/components/GroupForm';
import { getGroup } from '@/services/groups/groups-api';

export default function EditGroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [value, setValue] = useState<GroupFormValue | null>(null);
  const load = useCallback(async () => { if (!id) return; const group = await getGroup<{ name: string; description?: string; type: GroupFormValue['type']; capabilities: GroupFormValue['capabilities']; color?: string; icon?: string; members: Array<{ memberId: string; role: string }> }>(id); setValue({ name: group.name, description: group.description ?? '', type: group.type, capabilities: group.capabilities, color: group.color ?? 'primary', icon: group.icon ?? 'users', members: group.members.map((member) => ({ memberId: member.memberId, role: member.role })) }); }, [id]);
  useEffect(() => { void load(); }, [load]);
  return <WebPageLayout title="Editar grupo" description="Atualize os dados e participantes do grupo."><Button variant="ghost" onClick={() => router.push(`/groups/${id}`)}><ArrowLeft className="mr-2 h-4 w-4" />Voltar para o grupo</Button>{value ? <GroupForm groupId={id} initialValue={value} onSaved={() => router.push(`/groups/${id}`)} /> : <p className="text-sm text-muted-foreground">Carregando grupo...</p>}</WebPageLayout>;
}
