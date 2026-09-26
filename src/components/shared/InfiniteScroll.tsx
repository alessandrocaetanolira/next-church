'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface InfiniteScrollProps {
  children: ReactNode;
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  loadingLabel?: string;
  className?: string;
}

/** Observa o fim de qualquer lista e solicita a próxima página sem botão manual. */
export function InfiniteScroll({ children, hasMore, loading = false, onLoadMore, loadingLabel = 'Carregando mais...', className = '' }: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading || !sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) onLoadMore();
    }, { rootMargin: '280px' });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return (
    <div className={className}>
      {children}
      {hasMore ? <div ref={sentinelRef} className="min-h-8 py-2 text-center text-xs text-muted-foreground">{loading ? loadingLabel : null}</div> : null}
    </div>
  );
}
