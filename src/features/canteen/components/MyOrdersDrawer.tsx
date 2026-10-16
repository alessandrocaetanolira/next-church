'use client';

import { useMyCanteenOrders } from '../hooks/use-my-canteen-orders';
import { SharedFlatList } from '@/components/SharedFlatList';
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

/** Consulta pessoal; nunca usa a API operacional que lista vendas de terceiros. */
export function MyOrdersDrawer() {
  const { memberId, current, refresh } = useMyCanteenOrders();
  return <>
    <DrawerHeader><DrawerTitle>Meus pedidos</DrawerTitle><DrawerDescription>Acompanhe suas compras recentes na cantina.</DrawerDescription></DrawerHeader>
    <div className="space-y-3 px-4 pb-4">
      {!memberId ? <p className="text-sm text-muted-foreground">Sua conta precisa estar vinculada a um membro aprovado.</p>
        : !current ? <p role="status">Carregando pedidos...</p>
        : current.error ? <div role="alert"><p>Não foi possível consultar seus pedidos.</p><Button variant="outline" onClick={refresh}>Tentar novamente</Button></div>
        : <SharedFlatList data={current.sales} keyExtractor={(sale) => sale.id} emptyComponent={<p className="text-sm text-muted-foreground">Você ainda não tem pedidos.</p>} renderItem={(sale) => (
          <article className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2 text-sm"><span>{sale.orderStatus === 'cancelled' ? 'Cancelado' : sale.orderStatus === 'ready' ? 'Pronto' : sale.orderStatus === 'preparing' ? 'Em preparo' : sale.paymentMethod === 'pending' ? 'Aguardando aprovação' : 'Confirmado'}</span><strong>{formatCurrency(sale.total)}</strong></div>
            <p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleString('pt-BR')}</p>
            <ul className="text-sm">{sale.items.map((item, index) => <li key={`${item.productId}-${index}`}>{item.quantity} × {item.name}</li>)}</ul>
          </article>
        )} />}
    </div>
  </>;
}
