'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SharedFlatListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  emptyComponent?: ReactNode;
  className?: string;
}

/** Lista compartilhada para cards mobile e módulos que não precisam de tabela. */
export function SharedFlatList<T>({ data, renderItem, keyExtractor, emptyComponent, className }: SharedFlatListProps<T>) {
  if (data.length === 0) return <>{emptyComponent ?? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item encontrado.</p>}</>;
  return <div className={cn('grid gap-3', className)}>{data.map((item, index) => <div key={keyExtractor?.(item, index) ?? String(index)}>{renderItem(item, index)}</div>)}</div>;
}
