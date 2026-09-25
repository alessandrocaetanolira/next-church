'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);
}

function parseBRL(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) / 100 : 0;
}

export function CurrencyInput({ value, onValueChange, className, onBlur, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & { value: number; onValueChange: (value: number) => void }) {
  const [displayValue, setDisplayValue] = useState(formatBRL(value));
  useEffect(() => setDisplayValue(formatBRL(value)), [value]);
  return <input {...props} type="text" inputMode="numeric" value={displayValue} onChange={(event) => { const formatted = formatBRL(parseBRL(event.target.value)); setDisplayValue(formatted); onValueChange(parseBRL(formatted)); }} onBlur={(event) => { setDisplayValue(formatBRL(parseBRL(displayValue))); onBlur?.(event); }} className={cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm', className)} />;
}
