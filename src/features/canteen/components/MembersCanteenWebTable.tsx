'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

export type CanteenMember = { id: string; name: string; email?: string; phone?: string; creditBalance?: number; approved?: boolean };
type MembersCanteenWebTableProps = { members: CanteenMember[]; canUpdate: boolean; canDelete: boolean; onEdit: (member: CanteenMember) => void; onDelete: (id: string) => void };

export function MembersCanteenWebTable({ members, canUpdate, canDelete, onEdit, onDelete }: MembersCanteenWebTableProps) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><Table><TableHeader><TableRow><TableHead>Membro</TableHead><TableHead>Contato</TableHead><TableHead>Fiado</TableHead><TableHead>Status</TableHead><TableHead className="w-[160px] text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
    {members.map((member) => <TableRow key={member.id}><TableCell className="font-medium">{member.name}</TableCell><TableCell><div>{member.email || 'Sem email'}</div><div className="text-sm text-muted-foreground">{member.phone || 'Sem telefone'}</div></TableCell><TableCell>{(member.creditBalance ?? 0) > 0 ? <span className="font-medium text-warning">{formatCurrency(member.creditBalance ?? 0)}</span> : <Badge variant="success">Em dia</Badge>}</TableCell><TableCell>{member.approved === false ? <Badge variant="secondary">Pendente</Badge> : <Badge variant="outline">Aprovado</Badge>}</TableCell><TableCell><div className="flex justify-end gap-1">{canUpdate ? <Button size="icon" variant="ghost" onClick={() => onEdit(member)} aria-label={`Editar ${member.name}`}><Pencil className="h-4 w-4" /></Button> : null}{canDelete ? <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(member.id)} aria-label={`Excluir ${member.name}`}><Trash2 className="h-4 w-4" /></Button> : null}</div></TableCell></TableRow>)}
    {members.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum membro encontrado.</TableCell></TableRow> : null}
  </TableBody></Table></div>;
}
