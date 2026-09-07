import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type PageShellProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'default' | 'wide' | 'narrow';
};

const sizeClassName = {
  default: 'max-w-5xl',
  wide: 'max-w-7xl',
  narrow: 'max-w-3xl',
};

export function PageShell({ children, className, size = 'default', ...props }: PageShellProps) {
  return (
    <div className={cn('mx-auto space-y-4 p-4', sizeClassName[size], className)} {...props}>
      {children}
    </div>
  );
}
