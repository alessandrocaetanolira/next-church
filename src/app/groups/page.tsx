'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { FilterChip } from '@/components/ui/filter-chip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Baby, Car, Heart, Layers, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { hasActionPermission } from '@/lib/access-control';
import { listGroups, listJoinRequests, requestGroupJoin } from '@/services/groups/groups-api';
import { GroupsWebGrid } from '@/features/groups/components/GroupsWebGrid';
import { GroupsWebTable } from '@/features/groups/components/GroupsWebTable';
import { WebPageLayout } from '@/components/shared/web';
import { HorizontalScroll, LoadingState } from '@/components/common';

type GroupType = 'ministry' | 'team' | 'social_project' | 'kids' | 'parking';
type GroupCapability = 'fundraising' | 'enrollment' | 'communication' | 'scheduling' | 'checkin';

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

const icons: Record<GroupType, React.ComponentType<{ className?: string }>> = {
  ministry: Layers,
  team: Users,
  social_project: Heart,
  kids: Baby,
  parking: Car,
};

const groupTypeLabels = Object.fromEntries(groupTypes.map((item) => [item.value, item.label]));
const capabilityLabels = { fundraising: 'Arrecadação', enrollment: 'Inscrição', communication: 'Comunicação', scheduling: 'Escala', checkin: 'Check-in' };

function GroupsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | GroupType>('all');
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [requestingGroupId, setRequestingGroupId] = useState<string | null>(null);

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

  const loadData = useCallback(async () => {
    try {
      const [groupsData, joinRequestsData] = await Promise.all([
        listGroups<GroupItem[]>(),
        user?.linkedMemberId ? listJoinRequests<JoinRequestItem[]>() : Promise.resolve([]),
      ]);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setJoinRequests(Array.isArray(joinRequestsData) ? joinRequestsData : []);
    } catch {
      toast.error('Erro ao carregar grupos.');
    }
  }, [user?.linkedMemberId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  return (
    <WebPageLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo..." className="pl-9" />
        </div>
        <HorizontalScroll className="pb-1" ariaLabel="Filtros de grupos">
          <div className="flex w-max gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilterAndUrl('all')}>Todos</FilterChip>
          {groupTypes.map((type) => (
            <FilterChip key={type.value} active={filter === type.value} onClick={() => setFilterAndUrl(type.value)}>
              {type.label}
            </FilterChip>
          ))}
          </div>
        </HorizontalScroll>
        {canManage ? (
          <Button onClick={() => router.push('/groups/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Grupo
          </Button>
        ) : null}
      </div>

      <div className="hidden md:block">
        <GroupsWebTable
          groups={visibleGroups}
          groupTypeLabels={groupTypeLabels}
          capabilityLabels={capabilityLabels}
          canManage={canManage}
          canRequest={hasActionPermission(user, 'groups', 'request')}
          linkedMemberId={user?.linkedMemberId}
          hasPendingJoinRequest={hasPendingJoinRequest}
          requestingGroupId={requestingGroupId}
          onRequestJoin={(group) => void requestJoin(group)}
        />
      </div>
      <div className="md:hidden">
        <GroupsWebGrid
          groups={visibleGroups}
          groupTypeLabels={groupTypeLabels}
          capabilityLabels={capabilityLabels}
          icons={icons}
          linkedMemberId={user?.linkedMemberId}
          canManage={canManage}
          canRequest={hasActionPermission(user, 'groups', 'request')}
          hasPendingJoinRequest={hasPendingJoinRequest}
          requestingGroupId={requestingGroupId}
          onRequestJoin={(group) => void requestJoin(group)}
        />
      </div>

      {visibleGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum grupo encontrado.
          </CardContent>
        </Card>
      ) : null}

    </WebPageLayout>
  );
}

export default function GroupsPage() {
  return <Suspense fallback={<LoadingState label="Carregando grupos..." />}>
    <GroupsPageContent />
  </Suspense>;
}
