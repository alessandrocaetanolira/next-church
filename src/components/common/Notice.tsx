import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type NoticeVariant = 'default' | 'warning' | 'destructive' | 'success';

type NoticeProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  variant?: NoticeVariant;
  className?: string;
};

const variantClassName: Record<NoticeVariant, string> = {
  default: 'border-border bg-card text-foreground',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  destructive: 'border-destructive/20 bg-destructive/5 text-destructive',
  success: 'border-success/30 bg-success/10 text-success',
};

export function Notice({ title, description, icon, variant = 'default', className }: NoticeProps) {
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-4', variantClassName[variant], className)}>
      {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}
