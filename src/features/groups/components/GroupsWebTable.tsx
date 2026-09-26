'use client';

import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { GroupsWebGridItem, GroupsWebGridProps } from './GroupsWebGrid';

type GroupsWebTableProps = Pick<GroupsWebGridProps, 'groups' | 'groupTypeLabels' | 'capabilityLabels' | 'canManage' | 'canRequest' | 'linkedMemberId' | 'hasPendingJoinRequest' | 'requestingGroupId' | 'onRequestJoin'>;

export function GroupsWebTable({
  groups,
  groupTypeLabels,
  capabilityLabels,
  canManage,
  canRequest,
  linkedMemberId,
  hasPendingJoinRequest,
  requestingGroupId,
  onRequestJoin,
}: GroupsWebTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Grupo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Membros</TableHead>
            <TableHead>Capacidades</TableHead>
            <TableHead className="w-[180px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group: GroupsWebGridItem) => {
            const isTeam = group.type === 'team';
            const isMember = Boolean(linkedMemberId && group.members.some((member) => member.memberId === linkedMemberId));
            const hasPendingRequest = hasPendingJoinRequest(group.id);
            return (
              <TableRow key={group.id}>
                <TableCell>
                  <div className="min-w-[220px]">
                    <Link href={`/groups/${group.id}`} className="font-medium hover:text-primary">{group.name}</Link>
                    <p className="max-w-[360px] truncate text-sm text-muted-foreground">{group.description || 'Sem descrição cadastrada.'}</p>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{groupTypeLabels[group.type] ?? group.type}</Badge></TableCell>
                <TableCell>{group.members.length}</TableCell>
                <TableCell><div className="flex max-w-[320px] flex-wrap gap-1">{group.capabilities.length > 0 ? group.capabilities.map((capability) => <Badge key={capability} variant="outline" className="text-[11px]">{capabilityLabels[capability] ?? capability}</Badge>) : <span className="text-sm text-muted-foreground">Nenhuma</span>}</div></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="outline"><Link href={`/groups/${group.id}`}><Eye className="mr-2 h-4 w-4" />Detalhes</Link></Button>
                    {isTeam && !canManage && !isMember && canRequest ? <Button size="sm" variant="ghost" onClick={() => onRequestJoin(group)} disabled={hasPendingRequest || requestingGroupId === group.id || !linkedMemberId}>{hasPendingRequest ? 'Solicitado' : requestingGroupId === group.id ? 'Enviando...' : 'Ingressar'}</Button> : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {groups.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum grupo encontrado.</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  );
}
