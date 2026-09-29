'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Faixa horizontal com scrollbar oculto e indicação visual das extremidades. */
export function HorizontalScroll({ children, className, ariaLabel = 'Conteúdo rolável horizontalmente' }: { children: ReactNode; className?: string; ariaLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setEdges({ left: element.scrollLeft > 4, right: element.scrollLeft + element.clientWidth < element.scrollWidth - 4 });
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { element.removeEventListener('scroll', update); observer.disconnect(); };
  }, []);
  return <div className="relative min-w-0" role="region" aria-label={ariaLabel}>
    <div ref={ref} className={cn('scrollbar-hide overflow-x-auto overscroll-x-contain scroll-smooth', className)}>{children}</div>
    {edges.left ? <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-background to-transparent" /> : null}
    {edges.right ? <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-background to-transparent" /> : null}
  </div>;
}
