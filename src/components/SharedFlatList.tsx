'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { InfiniteScroll } from '@/components/shared/InfiniteScroll';

export interface SharedFlatListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  emptyComponent?: ReactNode;
  className?: string;
  onEndReached?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

/** Lista compartilhada para cards mobile e módulos que não precisam de tabela. */
export function SharedFlatList<T>({ data, renderItem, keyExtractor, emptyComponent, className, onEndReached, hasMore = false, loadingMore = false }: SharedFlatListProps<T>) {
  if (data.length === 0) return <>{emptyComponent ?? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item encontrado.</p>}</>;
  return (
    <InfiniteScroll hasMore={Boolean(onEndReached && hasMore)} loading={loadingMore} onLoadMore={onEndReached ?? (() => undefined)} className={cn('grid min-w-0 max-w-full gap-3', className)}>
      {data.map((item, index) => <div key={keyExtractor?.(item, index) ?? String(index)} className="min-w-0 max-w-full">{renderItem(item, index)}</div>)}
    </InfiniteScroll>
  );
}
