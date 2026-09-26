'use client';

import { Edit, Trash2 } from 'lucide-react';
import type { LocalProduct } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

type ProductsWebTableProps = {
  products: LocalProduct[];
  canUpdate: boolean;
  canDelete: boolean;
  savingId: string | null;
  onToggleAvailable: (productId: string, value: boolean) => void;
  onEdit: (productId: string) => void;
  onDelete: (productId: string) => void;
};

export function ProductsWebTable({ products, canUpdate, canDelete, savingId, onToggleAvailable, onEdit, onDelete }: ProductsWebTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Categoria</TableHead><TableHead>Preço</TableHead><TableHead>Estoque</TableHead><TableHead>Hoje</TableHead><TableHead className="w-[120px] text-right">Ações</TableHead></TableRow></TableHeader>
        <TableBody>
          {products.map((product) => {
            const lowStock = (product.minStock ?? 0) > 0 && product.stock <= (product.minStock ?? 0);
            return <TableRow key={product.id}>
              <TableCell><div><p className="font-medium">{product.name}</p><p className="max-w-[280px] truncate text-sm text-muted-foreground">{product.description || 'Sem descrição'}</p></div></TableCell>
              <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
              <TableCell className="font-medium">{formatCurrency(product.price)}</TableCell>
              <TableCell><span className={lowStock ? 'font-medium text-destructive' : ''}>{product.stock}</span> <span className="text-muted-foreground">un.</span>{lowStock ? <Badge className="ml-2" variant="destructive">Baixo</Badge> : null}</TableCell>
              <TableCell>{product.active === false ? <Badge variant="secondary">Inativo</Badge> : canUpdate ? <Switch checked={product.availableToday !== false} onCheckedChange={(value) => onToggleAvailable(product.id, value)} disabled={savingId === product.id} /> : product.availableToday === false ? <Badge variant="outline">Não</Badge> : <Badge variant="success">Sim</Badge>}</TableCell>
              <TableCell><div className="flex justify-end gap-1">{canUpdate ? <Button size="icon" variant="ghost" onClick={() => onEdit(product.id)} aria-label={`Editar ${product.name}`}><Edit className="h-4 w-4" /></Button> : null}{canDelete ? <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(product.id)} aria-label={`Excluir ${product.name}`}><Trash2 className="h-4 w-4" /></Button> : null}</div></TableCell>
            </TableRow>;
          })}
          {products.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhum produto encontrado.</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  );
}
