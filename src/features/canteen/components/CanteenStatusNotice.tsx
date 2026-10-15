'use client';

import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { useCanteenStatus } from '../hooks/use-canteen-status';

/** Distingue fechamento confirmado de consulta pendente ou indisponível. */
export function CanteenStatusNotice({ operation }: { operation: ReturnType<typeof useCanteenStatus> }) {
  if (operation.canCheckout) return null;
  const message = operation.loading || operation.updating
    ? 'Confirmando o status da cantina…'
    : operation.error ?? (operation.confirmed
      ? 'A cantina está fechada. Abra a operação para finalizar vendas.'
      : 'O status da cantina ainda não foi confirmado. Atualize para continuar.');

  return (
    <div role="status" className="space-y-2 rounded-xl bg-warning/10 p-3 text-sm text-foreground">
      <p className="flex items-start gap-2"><Store className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{message}</span></p>
      {!operation.loading && !operation.updating ? <Button type="button" size="sm" variant="outline" className="h-10" onClick={() => void operation.refresh()}>{operation.error ? 'Tentar novamente' : 'Atualizar status'}</Button> : null}
    </div>
  );
}
