'use client';

import { MessageSquare } from 'lucide-react';
import type { LocalMember } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

type DebtMember = LocalMember & { creditBalance?: number };
type DebtWebTableProps = { members: DebtMember[]; onShare: (member: DebtMember) => void; onReceive: (member: DebtMember) => void; onDetails: (member: DebtMember) => void };

export function DebtWebTable({ members, onShare, onReceive, onDetails }: DebtWebTableProps) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><Table><TableHeader><TableRow><TableHead>Membro</TableHead><TableHead>Contato</TableHead><TableHead>Saldo</TableHead><TableHead className="w-[220px] text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
    {members.map((member) => <TableRow key={member.id}><TableCell className="font-medium">{member.name}</TableCell><TableCell>{member.phone || member.email || 'Sem contato'}</TableCell><TableCell className="font-medium text-warning">{formatCurrency(member.creditBalance ?? 0)}</TableCell><TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => onShare(member)}><MessageSquare className="mr-1 h-4 w-4" />Avisar</Button><Button size="sm" variant="outline" onClick={() => onReceive(member)}>Receber</Button><Button size="sm" variant="outline" onClick={() => onDetails(member)}>Detalhes</Button></div></TableCell></TableRow>)}
    {members.length === 0 ? <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum fiado pendente.</TableCell></TableRow> : null}
  </TableBody></Table></div>;
}
