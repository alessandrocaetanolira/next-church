'use client';

import type { ReactNode } from 'react';
import { Filter } from 'lucide-react';
import { HorizontalScroll } from './HorizontalScroll';
import { cn } from '@/lib/utils';

type FilterBarProps = {
  children: ReactNode;
  label?: string;
  className?: string;
};

/** Agrupa filtros com rolagem horizontal acessível no mobile. */
export function FilterBar({ children, label = 'Filtros', className }: FilterBarProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <HorizontalScroll ariaLabel={label} className="flex gap-2 pb-1">
        {children}
      </HorizontalScroll>
    </div>
  );
}
