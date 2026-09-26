import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type WebPageHeaderProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function WebPageHeader({ title, description, icon, actions, className }: WebPageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
