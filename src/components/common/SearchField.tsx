'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SearchFieldProps = ComponentPropsWithoutRef<typeof Input> & {
  containerClassName?: string;
};

export function SearchField({ className, containerClassName, ...props }: SearchFieldProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={cn('pl-9', className)} {...props} />
    </div>
  );
}
