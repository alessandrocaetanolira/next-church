'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { AdminPlan } from '@/services/admin/plans-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SharedFlatList } from '@/components/SharedFlatList';

type PlansWebTableProps = {
  plans: AdminPlan[];
  onEdit: (plan: AdminPlan) => void;
  onDelete: (plan: AdminPlan) => void;
};

export function PlansWebTable({ plans, onEdit, onDelete }: PlansWebTableProps) {
  return (
    <>
      <div className="md:hidden">
        <SharedFlatList
          data={plans}
          keyExtractor={(plan) => plan.id}
          emptyComponent={<p className="py-8 text-center text-sm text-muted-foreground">Nenhum plano cadastrado.</p>}
          renderItem={(plan) => (
            <article className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{plan.name}</p>
                  <Badge variant="outline" className="mt-1">{plan.code}</Badge>
                </div>
                <Badge variant={plan.active ? 'success' : 'destructive'}>{plan.active ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <span>R$ {(plan.priceCents / 100).toFixed(2)}</span>
                <span>{plan.churches} igreja(s)</span>
                <span>{plan.maxUsers ?? 'Ilimitado'} usuários</span>
                <span>{plan.maxStorageMb ?? 'Ilimitado'} MB</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onEdit(plan)}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(plan)} disabled={plan.churches > 0} aria-label={`Excluir ${plan.name}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </article>
          )}
        />
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader><TableRow><TableHead>Plano</TableHead><TableHead>Preço</TableHead><TableHead>Limites</TableHead><TableHead>Igrejas</TableHead><TableHead>Status</TableHead><TableHead className="w-[140px] text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {plans.map((plan) => <TableRow key={plan.id}>
              <TableCell><div><p className="font-medium">{plan.name}</p><Badge variant="outline">{plan.code}</Badge></div></TableCell>
              <TableCell>R$ {(plan.priceCents / 100).toFixed(2)}</TableCell>
              <TableCell>{plan.maxUsers ?? 'Ilimitado'} usuários · {plan.maxStorageMb ?? 'Ilimitado'} MB</TableCell>
              <TableCell>{plan.churches}</TableCell>
              <TableCell><Badge variant={plan.active ? 'success' : 'destructive'}>{plan.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
              <TableCell><div className="flex justify-end gap-1"><Button variant="outline" size="sm" onClick={() => onEdit(plan)}><Pencil className="mr-1 h-4 w-4" />Editar</Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(plan)} disabled={plan.churches > 0} aria-label={`Excluir ${plan.name}`}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
            </TableRow>)}
            {plans.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhum plano cadastrado.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
