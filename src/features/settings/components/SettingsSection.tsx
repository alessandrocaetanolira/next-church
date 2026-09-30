'use client';

import type { ComponentType, ReactNode } from 'react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettingsViewMode } from '@/features/settings/screens/SettingsViewMode';

type SettingsSectionProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
};

/** Seção de configurações com composição desktop e mobile isolada da página. */
export function SettingsSection({ icon: Icon, title, children }: SettingsSectionProps) {
  const isMobile = useIsMobile();
  const viewMode = useSettingsViewMode();
  const [open, setOpen] = useState(false);
  const renderMobile = viewMode ? viewMode === 'mobile' : isMobile;

  if (!renderMobile) {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Icon className="h-5 w-5 shrink-0 text-primary" />
          <h3 className="flex-1 text-xl font-semibold tracking-tight">{title}</h3>
        </div>
        <div className="space-y-6">{children}</div>
      </section>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <CollapsibleTrigger className="flex w-full items-center gap-3 p-4 transition-colors hover:bg-muted/30">
        <Icon className="h-5 w-5 shrink-0 text-primary" />
        <h3 className="flex-1 text-left text-lg font-semibold">{title}</h3>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 px-4 pb-4 pt-0">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
