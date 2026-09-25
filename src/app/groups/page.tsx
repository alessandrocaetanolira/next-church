'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { FilterChip } from '@/components/ui/filter-chip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Baby, Car, Heart, Layers, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { hasActionPermission } from '@/lib/access-control';
import { createGroup, listGroups, listJoinRequests, listMembers, requestGroupJoin } from '@/services/groups/groups-api';

type GroupCapability = 'fundraising' | 'enrollment' | 'communication' | 'scheduling' | 'checkin';
type GroupType = 'ministry' | 'team' | 'social_project' | 'kids' | 'parking';

type GroupMember = {
  memberId: string;
  role: string;
  memberName?: string | null;
};

type GroupItem = {
  id: string;
  name: string;
  description?: string | null;
  type: GroupType;
  capabilities: GroupCapability[];
  color: string;
  icon: string;
  active: boolean;
  members: GroupMember[];
};

type MemberOption = {
  id: string;
  name: string;
};

type JoinRequestItem = {
  id: string;
  teamId: string;
  status: string;
};

const groupTypes: { value: GroupType; label: string }[] = [
  { value: 'team', label: 'Equipe' },
  { value: 'ministry', label: 'Ministério' },
  { value: 'social_project', label: 'Projeto Social' },
  { value: 'kids', label: 'Infantil' },
  { value: 'parking', label: 'Estacionamento' },
];

const capabilities: { value: GroupCapability; label: string }[] = [
  { value: 'fundraising', label: 'Arrecadação' },
  { value: 'enrollment', label: 'Inscrição' },
  { value: 'communication', label: 'Comunicação' },
  { value: 'scheduling', label: 'Escala' },
  { value: 'checkin', label: 'Check-in' },
];

const icons: Record<GroupType, React.ComponentType<{ className?: string }>> = {
  ministry: Layers,
  team: Users,
  social_project: Heart,
  kids: Baby,
  parking: Car,
};

function GroupsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | GroupType>('all');
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestingGroupId, setRequestingGroupId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'team' as GroupType,
    capabilities: [] as GroupCapability[],
    color: 'primary',
    icon: 'users',
    members: [] as Array<{ memberId: string; role: string }>,
  });

  const canManage = hasActionPermission(user, 'groups', 'create');

  useEffect(() => {
    setPageTitle('Grupos');
  }, [setPageTitle]);

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'team' || type === 'ministry' || type === 'social_project' || type === 'kids' || type === 'parking') {
      setFilter(type);
    } else {
      setFilter('all');
    }
  }, [searchParams]);

  useEffect(() => {
    void loadData();
  }, [user?.linkedMemberId]);

  const loadData = async () => {
    try {
      const [groupsData, membersData, joinRequestsData] = await Promise.all([
        listGroups<GroupItem[]>(),
        listMembers<MemberOption[]>(),
        user?.linkedMemberId ? listJoinRequests<JoinRequestItem[]>() : Promise.resolve([]),
      ]);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setMembers(
        (Array.isArray(membersData) ? membersData : []).map((member) => ({
          id: member.id,
          name: member.name,
        })),
      );
      setJoinRequests(Array.isArray(joinRequestsData) ? joinRequestsData : []);
    } catch {
      toast.error('Erro ao carregar grupos.');
    }
  };

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.filter((group) => {
      if (filter !== 'all' && group.type !== filter) return false;
      if (!query) return true;
      return (
        group.name.toLowerCase().includes(query) ||
        (group.description ?? '').toLowerCase().includes(query) ||
        group.members.some((member) => (member.memberName ?? '').toLowerCase().includes(query))
      );
    });
  }, [groups, search, filter]);

  const toggleCapability = (capability: GroupCapability) => {
    setForm((current) => ({
      ...current,
      capabilities: current.capabilities.includes(capability)
        ? current.capabilities.filter((value) => value !== capability)
        : [...current.capabilities, capability],
    }));
  };

  const toggleMember = (memberId: string) => {
    setForm((current) => ({
      ...current,
      members: current.members.some((member) => member.memberId === memberId)
        ? current.members.filter((member) => member.memberId !== memberId)
        : [...current.members, { memberId, role: 'member' }],
    }));
  };

  const setMemberRole = (memberId: string, role: string) => {
    setForm((current) => ({
      ...current,
      members: current.members.map((member) => (member.memberId === memberId ? { ...member, role } : member)),
    }));
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      type: 'team',
      capabilities: [],
      color: 'primary',
      icon: 'users',
      members: [],
    });
  };

  const hasPendingJoinRequest = (groupId: string) =>
    joinRequests.some((request) => request.teamId === groupId && request.status === 'pending');

  const requestJoin = async (group: GroupItem) => {
    if (!user?.linkedMemberId || group.type !== 'team') {
      toast.error('Seu acesso precisa estar vinculado a um membro.');
      return;
    }

    setRequestingGroupId(group.id);
    try {
      await requestGroupJoin(group.id);

      toast.success('Solicitação enviada para os responsáveis.');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao solicitar ingresso.');
    } finally {
      setRequestingGroupId(null);
    }
  };

  const setFilterAndUrl = (nextFilter: 'all' | GroupType) => {
    setFilter(nextFilter);
    const params = new URLSearchParams(searchParams.toString());
    if (nextFilter === 'all') {
      params.delete('type');
    } else {
      params.set('type', nextFilter);
    }
    const query = params.toString();
    router.replace(query ? `/groups?${query}` : '/groups');
  };

  const saveGroup = async () => {
    if (!form.name.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      await createGroup({
          name: form.name.trim(),
          description: form.description.trim(),
          type: form.type,
          capabilities: form.capabilities,
          color: form.color,
          icon: form.icon,
          members: form.members,
        });
      toast.success('Grupo criado.');
      setDrawerOpen(false);
      resetForm();
      await loadData();
    } catch {
      toast.error('Erro ao salvar grupo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 pb-28 md:pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo..." className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip active={filter === 'all'} onClick={() => setFilterAndUrl('all')}>Todos</FilterChip>
          {groupTypes.map((type) => (
            <FilterChip key={type.value} active={filter === type.value} onClick={() => setFilterAndUrl(type.value)}>
              {type.label}
            </FilterChip>
          ))}
        </div>
        {canManage ? (
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Grupo
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleGroups.map((group) => {
          const Icon = icons[group.type] ?? Layers;
          const isTeam = group.type === 'team';
          const isMember = Boolean(user?.linkedMemberId && group.members.some((member) => member.memberId === user.linkedMemberId));
          const isLeader = Boolean(user?.linkedMemberId && group.members.some((member) => member.memberId === user.linkedMemberId && ['leader', 'responsible'].includes(member.role)));
          const hasPendingRequest = hasPendingJoinRequest(group.id);
          return (
            <Card key={group.id} className="h-full overflow-hidden border-border transition-colors hover:border-primary/30">
              <Link href={`/groups/${group.id}`}>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary')}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{group.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{groupTypes.find((item) => item.value === group.type)?.label}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 whitespace-nowrap">{group.members.length} membros</Badge>
                  </div>
                  <p className="break-words text-sm text-muted-foreground">{group.description || 'Sem descrição cadastrada.'}</p>
                  {isTeam ? (
                    <div className="flex flex-wrap gap-2">
                      {isLeader ? <Badge className="whitespace-nowrap">Responsável</Badge> : null}
                      {isMember ? <Badge variant="outline" className="whitespace-nowrap">Participando</Badge> : null}
                      {!isMember && hasPendingRequest ? <Badge variant="secondary" className="whitespace-nowrap">Solicitado</Badge> : null}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {group.capabilities.length > 0 ? group.capabilities.map((capability) => (
                      <Badge key={capability} variant="outline" className="max-w-full break-words text-[11px]">
                        {capabilities.find((item) => item.value === capability)?.label ?? capability}
                      </Badge>
                    )) : (
                      <Badge variant="outline" className="text-[11px]">Sem capacidades</Badge>
                    )}
                  </div>
                </CardContent>
              </Link>
              {isTeam && !canManage && !isMember && hasActionPermission(user, 'groups', 'request') ? (
                <div className="px-4 pb-4">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => void requestJoin(group)}
                    disabled={hasPendingRequest || requestingGroupId === group.id || !user?.linkedMemberId}
                  >
                    {hasPendingRequest ? 'Solicitação enviada' : requestingGroupId === group.id ? 'Enviando...' : 'Solicitar ingresso'}
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {visibleGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum grupo encontrado.
          </CardContent>
        </Card>
      ) : null}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>Novo Grupo</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do grupo" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Descreva a finalidade do grupo" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as GroupType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groupTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Capacidades</Label>
              <div className="space-y-2 rounded-xl border border-border p-3">
                {capabilities.map((capability) => (
                  <button
                    key={capability.value}
                    type="button"
                    onClick={() => toggleCapability(capability.value)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors',
                      form.capabilities.includes(capability.value) ? 'border-primary bg-primary/5' : 'border-border',
                    )}
                  >
                    <span>{capability.label}</span>
                    <Badge variant={form.capabilities.includes(capability.value) ? 'default' : 'outline'}>
                      {form.capabilities.includes(capability.value) ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Membros</Label>
              <div className="space-y-3 rounded-xl border border-border p-3">
                {members.map((member) => {
                  const selected = form.members.some((entry) => entry.memberId === member.id);
                  return (
                    <div key={member.id} className="space-y-2 rounded-lg border border-border p-3">
                      <button
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        className="flex w-full items-center justify-between gap-3 text-sm"
                      >
                        <span>{member.name}</span>
                        <Badge variant={selected ? 'default' : 'outline'}>
                          {selected ? 'Selecionado' : 'Adicionar'}
                        </Badge>
                      </button>
                      {selected ? (
                        <Select value={form.members.find((entry) => entry.memberId === member.id)?.role ?? 'member'} onValueChange={(value) => setMemberRole(member.id, value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Membro</SelectItem>
                            <SelectItem value="leader">Líder</SelectItem>
                            <SelectItem value="responsible">Responsável</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <Button className="w-full" onClick={() => void saveGroup()} disabled={saving}>
              {saving ? 'Salvando...' : 'Criar Grupo'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default function GroupsPage() {
  return <Suspense fallback={<div className="p-8 text-center">Carregando grupos...</div>}>
    <GroupsPageContent />
  </Suspense>;
}
