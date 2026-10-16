'use client';

import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useCanteenStatus } from '../hooks/use-canteen-status';

/** Banner informativo: estado vem do store revalidado pelo SSE, nunca de um botão. */
export function CanteenStatusBanner({ operation }: { operation: ReturnType<typeof useCanteenStatus> }) {
  const checking = operation.loading || operation.updating;
  const confirmed = operation.confirmed && !checking;
  const open = confirmed && operation.status.isOpen;
  const title = checking ? 'Consultando a cantina…' : !confirmed ? 'Status indisponível' : open ? 'Cantina aberta' : 'Cantina fechada';
  const description = checking ? 'Aguarde a confirmação para enviar seu pedido.'
    : !confirmed ? 'Não foi possível confirmar a abertura. O status será consultado novamente ao reconectar.'
    : open ? 'Escolha seus produtos e envie seu pedido.'
    : 'Você pode ajustar o carrinho e enviar o pedido quando ela abrir.';

  return <div role="status" aria-live="polite" aria-atomic="true" className={cn('flex items-start gap-3 rounded-xl p-4', open ? 'bg-success/10' : confirmed ? 'bg-warning/10' : 'bg-muted')}>
    <Store aria-hidden="true" className={cn('mt-0.5 h-5 w-5 shrink-0', open ? 'text-success' : confirmed ? 'text-warning' : 'text-muted-foreground')} />
    <div className="min-w-0"><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
  </div>;
}
