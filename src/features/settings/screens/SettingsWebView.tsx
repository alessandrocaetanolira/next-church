'use client';

import type { ReactNode } from 'react';
import { SettingsViewModeProvider } from './SettingsViewMode';

export function SettingsWebView({ children }: { children: ReactNode }) {
  return <SettingsViewModeProvider mode="web"><div className="space-y-6">{children}</div></SettingsViewModeProvider>;
}
