'use client';

import type { LocalSale } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

type SalesWebTableProps = { sales: LocalSale[]; getPaymentLabel: (method: string) => string; onOpenSale: (id: string) => void };

export function SalesWebTable({ sales, getPaymentLabel, onOpenSale }: SalesWebTableProps) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Pagamento</TableHead><TableHead>Itens</TableHead><TableHead>Total</TableHead><TableHead className="w-[100px] text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
    {sales.map((sale) => <TableRow key={sale.id}><TableCell className="whitespace-nowrap">{new Date(sale.createdAt).toLocaleString('pt-BR')}</TableCell><TableCell>{sale.memberName || 'Não identificado'}</TableCell><TableCell><Badge variant={sale.paymentMethod === 'fiado' ? 'warning' : 'outline'}>{getPaymentLabel(sale.paymentMethod)}</Badge></TableCell><TableCell>{sale.items.length}</TableCell><TableCell className="font-medium">{formatCurrency(sale.total)}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => onOpenSale(sale.id)}>Detalhes</Button></TableCell></TableRow>)}
    {sales.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhuma venda encontrada.</TableCell></TableRow> : null}
  </TableBody></Table></div>;
}
