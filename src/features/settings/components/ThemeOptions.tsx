'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThemeVariant } from '@/components/providers/AppSettingsProvider';

export const themeOptions: { variant: ThemeVariant; label: string; color: string }[] = [
  { variant: 'default', label: 'Azul', color: '#3b82f6' },
  { variant: 'emerald', label: 'Verde', color: '#10b981' },
  { variant: 'violet', label: 'Violeta', color: '#8b5cf6' },
  { variant: 'rose', label: 'Rosa', color: '#f43f5e' },
  { variant: 'amber', label: 'Âmbar', color: '#f59e0b' },
  { variant: 'slate', label: 'Cinza', color: '#64748b' },
];

export const themeModes: { value: 'system' | 'light' | 'dark'; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export function ThemeOption({ label, color, selected, onClick }: { variant?: ThemeVariant; label: string; color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
      )}
    >
      <div className="h-8 w-8 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs font-medium">{label}</span>
      {selected ? <Check className="h-3 w-3 text-primary" /> : null}
    </button>
  );
}
