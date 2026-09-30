import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

/** Estado padrão para falhas recuperáveis de carregamento. */
export function ErrorState({
  title = 'Não foi possível carregar esta tela.',
  description = 'Tente novamente em instantes.',
  action,
  onRetry,
  retryLabel = 'Tentar novamente',
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn('border-destructive/20', className)} role="alert">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action ?? (onRetry ? <Button type="button" variant="outline" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />{retryLabel}</Button> : null)}
      </CardContent>
    </Card>
  );
}
