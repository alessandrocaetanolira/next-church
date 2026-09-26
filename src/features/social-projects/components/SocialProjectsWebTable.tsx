'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import type { Goal, GroupItem } from '@/app/social-projects/page';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type SocialProjectsWebTableProps = { projectCards: Array<{ group: GroupItem; goals: Goal[] }> };

export function SocialProjectsWebTable({ projectCards }: SocialProjectsWebTableProps) {
  const rows = projectCards.flatMap(({ group, goals }) => goals.map((goal) => ({ group, goal })));
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><Table><TableHeader><TableRow><TableHead>Projeto</TableHead><TableHead>Meta</TableHead><TableHead>Progresso</TableHead><TableHead>Participantes</TableHead></TableRow></TableHeader><TableBody>
    {rows.map(({ group, goal }) => { const percentage = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0; return <TableRow key={goal.id}><TableCell><Link href={`/groups/${group.id}`} className="flex items-center gap-2 font-medium hover:text-primary"><Heart className="h-4 w-4 text-pink-500" />{group.name}</Link></TableCell><TableCell><p className="font-medium">{goal.title}</p><p className="max-w-[300px] truncate text-sm text-muted-foreground">{goal.description || 'Sem descrição.'}</p></TableCell><TableCell><div className="min-w-[220px] space-y-1"><Progress value={percentage} className="h-2" /><span className="text-xs text-muted-foreground">R$ {goal.currentAmount.toFixed(2)} de R$ {goal.targetAmount.toFixed(2)}</span></div></TableCell><TableCell><Badge variant="secondary">{group.members.length} membros</Badge></TableCell></TableRow>; })}
    {rows.length === 0 ? <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum projeto social cadastrado.</TableCell></TableRow> : null}
  </TableBody></Table></div>;
}
