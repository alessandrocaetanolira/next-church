'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type PastoralAnnouncement = { id: string; title: string; content: string; createdByName: string; createdAt: string };
export type PastoralPendingMember = { id: string; name: string; email: string; phone: string; createdAt: string };
export type PastoralJoinRequest = { id: string; memberName: string; teamName: string; createdAt: string };
export type PastoralActiveMember = { id: string; name: string; email: string; phone: string; teamNames: string[] };

function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><Table><TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader><TableBody>{children}</TableBody></Table></div>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <TableRow><TableCell colSpan={colSpan} className="h-20 text-center text-muted-foreground">{text}</TableCell></TableRow>;
}

function ActionCells({ id, processingId, onAction }: { id: string; processingId: string | null; onAction: (id: string, action: 'approve' | 'reject') => void }) {
  return <TableCell className="text-right"><div className="flex justify-end gap-1"><Button size="sm" disabled={processingId === id} onClick={() => onAction(id, 'approve')}>Aprovar</Button><Button size="sm" variant="outline" disabled={processingId === id} onClick={() => onAction(id, 'reject')}>Recusar</Button></div></TableCell>;
}

export function PastoralAnnouncementsTable({ items, onDelete }: { items: PastoralAnnouncement[]; onDelete: (id: string) => void }) {
  return <TableShell headers={['Aviso', 'Autor', 'Data', 'Ações']}><>{items.map((item) => <TableRow key={item.id}><TableCell><p className="font-medium">{item.title}</p><p className="max-w-[440px] truncate text-sm text-muted-foreground">{item.content}</p></TableCell><TableCell>{item.createdByName}</TableCell><TableCell className="whitespace-nowrap">{format(new Date(item.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(item.id)}>Remover</Button></TableCell></TableRow>)}{items.length === 0 ? <EmptyRow colSpan={4} text="Nenhum aviso publicado." /> : null}</></TableShell>;
}

export function PastoralRequestsTable({ members, requests, processingId, onMember, onRequest }: { members: PastoralPendingMember[]; requests: PastoralJoinRequest[]; processingId: string | null; onMember: (id: string, action: 'approve' | 'reject') => void; onRequest: (id: string, action: 'approve' | 'reject') => void }) {
  return <div className="space-y-6"><TableShell headers={['Novo membro', 'Contato', 'Data', 'Ações']}><>{members.map((member) => <TableRow key={member.id}><TableCell className="font-medium">{member.name}</TableCell><TableCell>{member.email} · {member.phone}</TableCell><TableCell>{format(new Date(member.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell><ActionCells id={member.id} processingId={processingId} onAction={onMember} /></TableRow>)}{members.length === 0 ? <EmptyRow colSpan={4} text="Nenhum novo membro pendente." /> : null}</></TableShell><TableShell headers={['Solicitação', 'Data', 'Ações']}><>{requests.map((request) => <TableRow key={request.id}><TableCell><p className="font-medium">{request.memberName}</p><p className="text-sm text-muted-foreground">Quer entrar em {request.teamName}</p></TableCell><TableCell>{format(new Date(request.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell><ActionCells id={request.id} processingId={processingId} onAction={onRequest} /></TableRow>)}{requests.length === 0 ? <EmptyRow colSpan={3} text="Nenhuma solicitação de ingresso pendente." /> : null}</></TableShell></div>;
}

export function PastoralMembersTable({ members }: { members: PastoralActiveMember[] }) {
  return <TableShell headers={['Membro', 'Contato', 'Times']}><>{members.map((member) => <TableRow key={member.id}><TableCell className="font-medium">{member.name}</TableCell><TableCell>{member.email} · {member.phone}</TableCell><TableCell><div className="flex flex-wrap gap-1">{member.teamNames.length ? member.teamNames.map((team) => <Badge key={team} variant="outline">{team}</Badge>) : <Badge variant="secondary">Sem time</Badge>}</div></TableCell></TableRow>)}{members.length === 0 ? <EmptyRow colSpan={3} text="Nenhum membro ativo." /> : null}</></TableShell>;
}
