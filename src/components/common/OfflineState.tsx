import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type OfflineStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

/** Estado explícito para operações que dependem de rede. */
export function OfflineState({
  title = 'Você está offline.',
  description = 'Conecte-se novamente para atualizar estes dados.',
  onRetry,
  className,
}: OfflineStateProps) {
  return (
    <Card className={cn('border-border/60', className)} role="status">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <WifiOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {onRetry ? <Button type="button" variant="outline" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Verificar conexão</Button> : null}
      </CardContent>
    </Card>
  );
}
