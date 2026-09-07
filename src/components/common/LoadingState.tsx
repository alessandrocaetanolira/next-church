import { cn } from '@/lib/utils';

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ label = 'Carregando...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex items-center justify-center py-10 text-sm text-muted-foreground', className)}>
      {label}
    </div>
  );
}
