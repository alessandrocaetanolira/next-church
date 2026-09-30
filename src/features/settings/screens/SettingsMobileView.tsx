'use client';

import type { ReactNode } from 'react';
import { SettingsViewModeProvider } from './SettingsViewMode';

export function SettingsMobileView({ children }: { children: ReactNode }) {
  return <SettingsViewModeProvider mode="mobile"><div className="space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">{children}</div></SettingsViewModeProvider>;
}
