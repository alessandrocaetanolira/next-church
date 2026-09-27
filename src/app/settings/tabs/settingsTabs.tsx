import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SettingsTab = 'appearance' | 'offline' | 'notifications' | 'church';

export function SettingsTabs({ value, onChange }: { value: SettingsTab; onChange: (value: SettingsTab) => void }) {
  return (
    <nav aria-label="Categorias das configurações" className="flex w-full gap-1 overflow-x-auto border-b border-border">
      {([
        ['appearance', 'Aparência'],
        ['offline', 'Bíblia offline'],
        ['notifications', 'Notificações'],
        ['church', 'Igreja'],
      ] as const).map(([tab, label]) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            'shrink-0 border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:text-sm',
            value === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export function SettingsTabPanel({ active, value, children }: { active: boolean; value: SettingsTab; children: ReactNode }) {
  return <div className={cn(active ? 'space-y-4' : 'hidden')}>{children}</div>;
}
