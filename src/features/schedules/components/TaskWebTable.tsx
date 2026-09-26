'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import type { LocalTask, LocalTeam } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type TaskWebTableProps = { tasks: LocalTask[]; teams: LocalTeam[]; canDelete: boolean; onDelete: (id: string) => void };

export function TaskWebTable({ tasks, teams, canDelete, onDelete }: TaskWebTableProps) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><Table><TableHeader><TableRow><TableHead>Escala</TableHead><TableHead>Equipe</TableHead><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead className="w-[80px] text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
    {tasks.map((task) => { const team = teams.find((item) => item.id === task.teamId); return <TableRow key={task.id}><TableCell><div><p className="font-medium">{task.title}</p><p className="max-w-[340px] truncate text-sm text-muted-foreground">{task.description || 'Sem descrição'}</p></div></TableCell><TableCell><Badge variant="outline" style={{ borderColor: team?.color, color: team?.color }}>{team?.name || 'Sem equipe'}</Badge></TableCell><TableCell className="whitespace-nowrap">{format(new Date(task.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell><TableCell>{task.type}</TableCell><TableCell className="text-right">{canDelete ? <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(task.id)} aria-label={`Excluir ${task.title}`}><Trash2 className="h-4 w-4" /></Button> : null}</TableCell></TableRow>; })}
    {tasks.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhuma tarefa agendada.</TableCell></TableRow> : null}
  </TableBody></Table></div>;
}
