'use client';

import { Send } from 'lucide-react';
import type { KidsChild, KidsGroupOption } from '@/services/kids/kids-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type KidsWebTableProps = { childrenList: KidsChild[]; groups: KidsGroupOption[]; canUpdate: boolean; canDelete: boolean; onEdit: (child: KidsChild) => void; onNotify: (child: KidsChild) => void; onDelete: (id: string) => void };

export function KidsWebTable({ childrenList, groups, canUpdate, canDelete, onEdit, onNotify, onDelete }: KidsWebTableProps) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><Table><TableHeader><TableRow><TableHead>Criança</TableHead><TableHead>Grupos</TableHead><TableHead>Restrições</TableHead><TableHead>Atividades</TableHead><TableHead className="w-[220px] text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
    {childrenList.map((child) => <TableRow key={child.id}><TableCell><div><p className="font-medium">{child.name}</p><p className="text-sm text-muted-foreground">{child.birthDate ? String(child.birthDate).slice(0, 10) : 'Sem nascimento informado'}</p></div></TableCell><TableCell><div className="flex max-w-[220px] flex-wrap gap-1">{child.groupIds.map((groupId) => <Badge key={groupId} variant="outline" className="text-[11px]">{groups.find((group) => group.id === groupId)?.name ?? 'Grupo infantil'}</Badge>)}</div></TableCell><TableCell><div className="max-w-[260px] text-sm text-muted-foreground">{[child.allergies, child.medications, child.dietaryRestrictions].filter(Boolean).join(' · ') || 'Nenhuma'}</div></TableCell><TableCell><Badge variant={child.canDoPhysicalActivities === false ? 'destructive' : 'secondary'}>{child.canDoPhysicalActivities === false ? 'Restrição física' : 'Atividades ok'}</Badge></TableCell><TableCell><div className="flex justify-end gap-1">{canUpdate ? <Button size="sm" variant="outline" onClick={() => onEdit(child)}>Editar</Button> : null}{canUpdate ? <Button size="icon" variant="outline" onClick={() => onNotify(child)} aria-label={`Avisar responsáveis de ${child.name}`}><Send className="h-4 w-4" /></Button> : null}{canDelete ? <Button size="sm" variant="destructive" onClick={() => onDelete(child.id)}>Excluir</Button> : null}</div></TableCell></TableRow>)}
    {childrenList.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhuma criança encontrada.</TableCell></TableRow> : null}
  </TableBody></Table></div>;
}
