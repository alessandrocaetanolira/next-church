'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type GroupsWebGridItem = {
  id: string;
  name: string;
  description?: string | null;
  type: 'ministry' | 'team' | 'social_project' | 'kids' | 'parking';
  color: string;
  icon: string;
  active: boolean;
  capabilities: Array<'fundraising' | 'enrollment' | 'communication' | 'scheduling' | 'checkin'>;
  members: Array<{ memberId: string; role: string; memberName?: string | null }>;
};

export type GroupsWebGridProps = {
  groups: GroupsWebGridItem[];
  groupTypeLabels: Record<string, string>;
  capabilityLabels: Record<string, string>;
  icons: Record<string, ComponentType<{ className?: string }>>;
  linkedMemberId?: string | null;
  canManage: boolean;
  canRequest: boolean;
  hasPendingJoinRequest: (groupId: string) => boolean;
  requestingGroupId: string | null;
  onRequestJoin: (group: GroupsWebGridItem) => void;
};

export function GroupsWebGrid({
  groups,
  groupTypeLabels,
  capabilityLabels,
  icons,
  linkedMemberId,
  canManage,
  canRequest,
  hasPendingJoinRequest,
  requestingGroupId,
  onRequestJoin,
}: GroupsWebGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => {
        const Icon = icons[group.type] ?? Layers;
        const isTeam = group.type === 'team';
        const isMember = Boolean(linkedMemberId && group.members.some((member) => member.memberId === linkedMemberId));
        const isLeader = Boolean(linkedMemberId && group.members.some((member) => member.memberId === linkedMemberId && ['leader', 'responsible'].includes(member.role)));
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
                      <p className="truncate text-xs text-muted-foreground">{groupTypeLabels[group.type] ?? group.type}</p>
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
                      {capabilityLabels[capability] ?? capability}
                    </Badge>
                  )) : <Badge variant="outline" className="text-[11px]">Sem capacidades</Badge>}
                </div>
              </CardContent>
            </Link>
            {isTeam && !canManage && !isMember && canRequest ? (
              <div className="px-4 pb-4">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => onRequestJoin(group)}
                  disabled={hasPendingRequest || requestingGroupId === group.id || !linkedMemberId}
                >
                  {hasPendingRequest ? 'Solicitação enviada' : requestingGroupId === group.id ? 'Enviando...' : 'Solicitar ingresso'}
                </Button>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
